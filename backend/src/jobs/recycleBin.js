const File = require('../models/File');
const User = require('../models/User');
const s3Service = require('../services/s3');
const logger = require('../utils/logger');

/**
 * Cron job: Auto-delete recycle bin items older than 30 days
 * Schedule: Daily at 2 AM
 */
const autoDeleteRecycleBin = async () => {
  logger.info('🗑️  Running recycle bin cleanup job...');
  
  try {
    const expiredFiles = await File.find({
      status: 'recycled',
      autoDeleteAt: { $lte: new Date() },
    });

    if (expiredFiles.length === 0) {
      logger.info('No files to auto-delete from recycle bin');
      return;
    }

    logger.info(`Found ${expiredFiles.length} files to permanently delete`);

    // Group by owner for storage update
    const ownerSizes = {};
    for (const file of expiredFiles) {
      const ownerId = file.owner.toString();
      ownerSizes[ownerId] = (ownerSizes[ownerId] || 0) + file.size;
    }

    // Delete from S3
    const s3Keys = expiredFiles.map(f => f.storageKey).filter(Boolean);
    if (s3Keys.length > 0) {
      await s3Service.deleteMultiple(s3Keys).catch(err => logger.error('S3 bulk delete failed:', err));
    }

    // Delete file records
    const fileIds = expiredFiles.map(f => f._id);
    await File.deleteMany({ _id: { $in: fileIds } });

    // Update user storage
    for (const [ownerId, totalSize] of Object.entries(ownerSizes)) {
      await User.findByIdAndUpdate(ownerId, {
        $inc: { 'storage.usedBytes': -totalSize },
      });
    }

    logger.info(`✅ Auto-deleted ${expiredFiles.length} files from recycle bin`);
  } catch (err) {
    logger.error('Recycle bin cleanup job failed:', err);
  }
};

module.exports = { autoDeleteRecycleBin };
