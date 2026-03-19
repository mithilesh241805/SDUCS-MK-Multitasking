const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Cron job: Check and expire subscriptions
 * Schedule: Every hour
 */
const checkExpiredSubscriptions = async () => {
  try {
    const now = new Date();
    const expired = await User.find({
      'subscription.plan': { $ne: 'free' },
      'subscription.expiresAt': { $lte: now },
    });

    if (expired.length === 0) return;

    logger.info(`Found ${expired.length} expired subscriptions`);

    for (const user of expired) {
      user.subscription.plan = 'free';
      user.subscription.expiresAt = null;
      await user.save();
    }

    logger.info(`✅ Expired ${expired.length} subscriptions`);
  } catch (err) {
    logger.error('Subscription cleanup job failed:', err);
  }
};

module.exports = { checkExpiredSubscriptions };
