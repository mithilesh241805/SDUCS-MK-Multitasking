const AdEvent = require('../models/AdEvent');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * @route   POST /api/ads/rewarded/complete
 * @desc    Record completed rewarded ad, grant storage reward
 */
const completeRewardedAd = async (req, res) => {
  try {
    const { adUnit, viewDuration, deviceId, sessionId, rewardType = 'storage' } = req.body;

    const user = await User.findById(req.user._id);
    user.resetDailyAdsIfNeeded();

    // Check daily limit
    if (user.ads.dailyCount >= user.ads.dailyLimit) {
      return res.status(429).json({
        error: `Daily ad limit reached (${user.ads.dailyLimit}/day). Come back tomorrow!`,
        dailyCount: user.ads.dailyCount,
        dailyLimit: user.ads.dailyLimit,
      });
    }

    // Anti-abuse: Check view duration (rewarded ads are typically 15-30 seconds)
    const isSuspicious = viewDuration && viewDuration < 5;
    let suspiciousReason = null;
    if (isSuspicious) suspiciousReason = 'Unusually short view duration';

    // Check for too many recent ads from same IP
    const recentAds = await AdEvent.countDocuments({
      ipAddress: req.ip,
      viewedAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
    });

    const isAbuse = recentAds > 20;
    if (isAbuse) {
      user.ads.suspiciousActivity = true;
      await user.save();
      return res.status(429).json({ error: 'Suspicious activity detected. Account flagged.' });
    }

    // Calculate reward
    const rewardBytes = AdEvent.calculateStorageReward();
    const estimatedRevenue = AdEvent.estimateRevenue('rewarded');

    // Check daily storage reward cap
    let actualReward = rewardBytes;
    if (rewardType === 'storage') {
      const remaining = user.storage.dailyRewardCap - user.storage.dailyRewardEarned;
      if (remaining <= 0) {
        return res.status(429).json({
          error: 'Daily storage reward cap reached (2GB). Come back tomorrow!',
          capReached: true,
        });
      }
      actualReward = Math.min(rewardBytes, remaining);
    }

    // Grant reward
    if (rewardType === 'storage') {
      user.addStorage(actualReward);
      user.storage.dailyRewardEarned += actualReward;
    } else {
      user.downloadData.totalBytes += actualReward;
    }

    user.ads.dailyCount += 1;
    user.ads.totalAdsWatched += 1;
    await user.save();

    // Record ad event
    await AdEvent.create({
      user: user._id,
      adType: 'rewarded',
      adUnit,
      rewardType,
      rewardBytes: actualReward,
      estimatedRevenue,
      eCPM: estimatedRevenue * 1000,
      deviceId,
      ipAddress: req.ip,
      sessionId,
      isSuspicious,
      suspiciousReason,
      viewDuration,
      status: isSuspicious ? 'partially_viewed' : 'completed',
    });

    // Emit update via socket
    const io = req.app.get('io');
    io.to(user._id.toString()).emit('reward_granted', {
      rewardBytes: actualReward,
      rewardType,
      totalStorage: user.storage.totalBytes,
      dailyRewardEarned: user.storage.dailyRewardEarned,
    });

    const rewardMB = (actualReward / (1024 * 1024)).toFixed(0);

    res.json({
      message: `🎉 You earned ${rewardMB}MB of ${rewardType === 'storage' ? 'cloud storage' : 'download data'}!`,
      rewardBytes: actualReward,
      rewardMB: parseInt(rewardMB),
      rewardType,
      dailyAdsCount: user.ads.dailyCount,
      dailyAdsLimit: user.ads.dailyLimit,
      dailyRewardEarned: user.storage.dailyRewardEarned,
      dailyRewardCap: user.storage.dailyRewardCap,
      newStorageTotal: user.storage.totalBytes,
    });
  } catch (err) {
    logger.error('Ad complete error:', err);
    res.status(500).json({ error: 'Failed to process ad reward' });
  }
};

/**
 * @route   POST /api/ads/interstitial/record
 * @desc    Record interstitial ad view
 */
const recordInterstitialAd = async (req, res) => {
  try {
    const { adUnit, deviceId } = req.body;
    const estimatedRevenue = AdEvent.estimateRevenue('interstitial');

    await AdEvent.create({
      user: req.user._id,
      adType: 'interstitial',
      adUnit,
      rewardBytes: 0,
      estimatedRevenue,
      deviceId,
      ipAddress: req.ip,
      status: 'completed',
    });

    res.json({ message: 'Ad recorded', estimatedRevenue });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record ad' });
  }
};

/**
 * @route   GET /api/ads/stats
 * @desc    Get ad stats for current user
 */
const getAdStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.resetDailyAdsIfNeeded();

    const totalRevenue = await AdEvent.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: null, total: { $sum: '$estimatedRevenue' } } },
    ]);

    res.json({
      dailyAdsCount: user.ads.dailyCount,
      dailyAdsLimit: user.ads.dailyLimit,
      totalAdsWatched: user.ads.totalAdsWatched,
      dailyRewardEarned: user.storage.dailyRewardEarned,
      dailyRewardCap: user.storage.dailyRewardCap,
      adsRemaining: Math.max(0, user.ads.dailyLimit - user.ads.dailyCount),
      estimatedAppRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ad stats' });
  }
};

/**
 * @route   GET /api/admin/ads/revenue
 * @desc    Admin: Get revenue analytics
 */
const getRevenueAnalytics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const analytics = await AdEvent.aggregate([
      { $match: { viewedAt: { $gte: since }, isSuspicious: false } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$viewedAt' } },
          totalRevenue: { $sum: '$estimatedRevenue' },
          totalAds: { $sum: 1 },
          rewardedAds: { $sum: { $cond: [{ $eq: ['$adType', 'rewarded'] }, 1, 0] } },
          interstitialAds: { $sum: { $cond: [{ $eq: ['$adType', 'interstitial'] }, 1, 0] } },
          avgEcpm: { $avg: '$eCPM' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totals = await AdEvent.aggregate([
      { $match: { isSuspicious: false } },
      { $group: { _id: null, totalRevenue: { $sum: '$estimatedRevenue' }, totalAds: { $sum: 1 } } },
    ]);

    res.json({ analytics, totals: totals[0] || {}, days });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

module.exports = { completeRewardedAd, recordInterstitialAd, getAdStats, getRevenueAnalytics };
