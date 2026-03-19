const Payment = require('../models/Payment');
const logger = require('../utils/logger');

/**
 * Cron job: Cleanup expired QR codes
 * Schedule: Every 30 minutes
 */
const cleanupExpiredQRCodes = async () => {
  try {
    const result = await Payment.updateMany(
      { status: 'pending', qrExpiresAt: { $lte: new Date() } },
      { status: 'cancelled' }
    );

    if (result.modifiedCount > 0) {
      logger.info(`✅ Cancelled ${result.modifiedCount} expired QR payments`);
    }
  } catch (err) {
    logger.error('QR cleanup job failed:', err);
  }
};

module.exports = { cleanupExpiredQRCodes };
