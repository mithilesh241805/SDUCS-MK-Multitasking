const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.use(protect);

// @route GET /api/users/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const File = require('../models/File');
    const Payment = require('../models/Payment');
    const AdEvent = require('../models/AdEvent');

    const [fileStats, recentPayments, adStats] = await Promise.all([
      File.aggregate([
        { $match: { owner: user._id, status: 'active' } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalSize: { $sum: '$size' },
          },
        },
      ]),
      Payment.find({ user: user._id, status: 'completed' }).sort({ createdAt: -1 }).limit(5),
      AdEvent.aggregate([
        { $match: { user: user._id } },
        { $group: { _id: null, totalAds: { $sum: 1 }, totalRevenue: { $sum: '$estimatedRevenue' } } },
      ]),
    ]);

    user.resetDailyAdsIfNeeded();
    await user.save();

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        avatarColor: user.avatarColor,
        theme: user.theme,
      },
      storage: {
        usedBytes: user.storage.usedBytes,
        totalBytes: user.storage.totalBytes,
        availableBytes: user.storage.totalBytes - user.storage.usedBytes,
        usedPercent: Math.round((user.storage.usedBytes / user.storage.totalBytes) * 100),
        dailyRewardEarned: user.storage.dailyRewardEarned,
        dailyRewardCap: user.storage.dailyRewardCap,
      },
      downloadData: {
        usedBytes: user.downloadData.usedBytes,
        totalBytes: user.downloadData.totalBytes,
        availableBytes: user.downloadData.totalBytes - user.downloadData.usedBytes,
      },
      subscription: {
        plan: user.subscription.plan,
        expiresAt: user.subscription.expiresAt,
        isActive: user.subscription.expiresAt && user.subscription.expiresAt > new Date(),
      },
      ads: {
        dailyCount: user.ads.dailyCount,
        dailyLimit: user.ads.dailyLimit,
        adsRemaining: Math.max(0, user.ads.dailyLimit - user.ads.dailyCount),
        totalAdsWatched: adStats[0]?.totalAds || 0,
      },
      fileStats,
      recentPayments,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// @route PUT /api/users/theme
router.put('/theme', async (req, res) => {
  try {
    const { theme } = req.body;
    if (!['dark', 'light', 'system'].includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme' });
    }
    await User.findByIdAndUpdate(req.user._id, { theme });
    res.json({ message: 'Theme updated', theme });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

// @route PUT /api/users/fcm-token
router.put('/fcm-token', async (req, res) => {
  try {
    const { token } = req.body;
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { deviceTokens: token } });
    res.json({ message: 'FCM token registered' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register FCM token' });
  }
});

module.exports = router;
