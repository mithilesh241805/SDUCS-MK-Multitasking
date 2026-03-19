const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const File = require('../models/File');
const User = require('../models/User');
const s3Service = require('../services/s3');
const aiService = require('../services/ai');
const logger = require('../utils/logger');

const CATEGORIES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'],
  video: ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm', 'video/mpeg'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/aac', 'audio/mp3'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'text/plain', 'application/vnd.ms-powerpoint'],
  archive: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-tar'],
};

const getCategory = (mimeType) => {
  for (const [cat, types] of Object.entries(CATEGORIES)) {
    if (types.includes(mimeType)) return cat;
  }
  return 'other';
};

const generate6DigitCode = () => Math.floor(100000 + Math.random() * 900000).toString();

/**
 * @route   POST /api/files/upload
 * @desc    Upload file to cloud storage
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const user = await User.findById(req.user._id);
    const fileSize = req.file.size;

    // Check storage capacity
    if (user.storage.usedBytes + fileSize > user.storage.totalBytes) {
      return res.status(400).json({
        error: 'Insufficient storage',
        available: user.storage.totalBytes - user.storage.usedBytes,
        required: fileSize,
      });
    }

    // Generate file hash
    const md5Hash = crypto.createHash('md5').update(req.file.buffer).digest('hex');
    const sha256Hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

    // Check for existing duplicate
    const existingDuplicate = await File.findOne({ owner: user._id, md5Hash, status: 'active' });

    // Encrypt file buffer (AES-256)
    const aesKey = process.env.AES_SECRET_KEY;
    const iv = CryptoJS.lib.WordArray.random(16);
    const wordArray = CryptoJS.lib.WordArray.create(req.file.buffer);
    const encrypted = CryptoJS.AES.encrypt(wordArray, CryptoJS.enc.Hex.parse(aesKey), {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const encryptedBuffer = Buffer.from(encrypted.toString(), 'base64');
    const ivHex = iv.toString(CryptoJS.enc.Hex);

    // Upload to S3
    const fileKey = `files/${user._id}/${uuidv4()}-${req.file.originalname}`;
    const mimeType = req.file.mimetype || mime.lookup(req.file.originalname) || 'application/octet-stream';
    const category = getCategory(mimeType);

    const uploadResult = await s3Service.uploadFile({
      key: fileKey,
      buffer: encryptedBuffer,
      contentType: 'application/octet-stream', // Always encrypted
      metadata: {
        originalName: req.file.originalname,
        mimeType,
        ownerId: user._id.toString(),
      },
    });

    // Generate thumbnail for images
    let thumbnailUrl = null;
    if (category === 'image') {
      try {
        const sharp = require('sharp');
        const thumbBuffer = await sharp(req.file.buffer).resize(200, 200, { fit: 'cover' }).jpeg({ quality: 70 }).toBuffer();
        const thumbKey = `thumbnails/${user._id}/${uuidv4()}-thumb.jpg`;
        await s3Service.uploadFile({ key: thumbKey, buffer: thumbBuffer, contentType: 'image/jpeg' });
        thumbnailUrl = await s3Service.getSignedUrl(thumbKey, 3600 * 24 * 7);
      } catch (thumbErr) {
        logger.warn('Thumbnail generation failed:', thumbErr);
      }
    }

    // AI categorization (async)
    let aiLabels = [];
    try {
      if (category === 'image') {
        aiLabels = await aiService.categorizeFile(req.file.buffer, mimeType);
      }
    } catch (aiErr) {
      logger.warn('AI categorization failed:', aiErr);
    }

    // Create file record
    const file = await File.create({
      owner: user._id,
      name: req.file.originalname,
      originalName: req.file.originalname,
      mimeType,
      extension: mime.extension(mimeType) || '',
      size: fileSize,
      category,
      storageProvider: 's3',
      storageKey: fileKey,
      thumbnailUrl,
      md5Hash,
      sha256Hash,
      isEncrypted: true,
      encryptionIV: ivHex,
      aiLabels,
      isDuplicate: !!existingDuplicate,
      duplicateOf: existingDuplicate ? existingDuplicate._id : null,
    });

    // Update user storage
    user.storage.usedBytes += fileSize;
    await user.save();

    // Emit storage update via socket
    const io = req.app.get('io');
    io.to(user._id.toString()).emit('storage_updated', {
      usedBytes: user.storage.usedBytes,
      totalBytes: user.storage.totalBytes,
    });

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: file._id,
        name: file.name,
        size: file.size,
        sizeFormatted: file.sizeFormatted,
        category: file.category,
        mimeType: file.mimeType,
        thumbnailUrl: file.thumbnailUrl,
        aiLabels: file.aiLabels,
        isDuplicate: file.isDuplicate,
        duplicateOf: file.duplicateOf,
        createdAt: file.createdAt,
      },
      storage: {
        usedBytes: user.storage.usedBytes,
        totalBytes: user.storage.totalBytes,
        availableBytes: user.storage.totalBytes - user.storage.usedBytes,
      },
    });
  } catch (err) {
    logger.error('Upload error:', err);
    res.status(500).json({ error: 'File upload failed' });
  }
};

/**
 * @route   GET /api/files
 * @desc    List user files
 */
const getFiles = async (req, res) => {
  try {
    const { category, status = 'active', page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;

    const query = { owner: req.user._id, status };
    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };

    const [files, total] = await Promise.all([
      File.find(query).sort({ createdAt: -1 }).skip(skip).limit(+limit),
      File.countDocuments(query),
    ]);

    // Generate signed URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const url = await s3Service.getSignedUrl(file.storageKey, 3600).catch(() => null);
        return { 
          ...file.toJSON(),
          downloadUrl: url,
        };
      })
    );

    res.json({
      files: filesWithUrls,
      pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error('Get files error:', err);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
};

/**
 * @route   GET /api/files/duplicates
 * @desc    Get all duplicate files for user
 */
const getDuplicates = async (req, res) => {
  try {
    // Find all hashes with duplicates
    const duplicateHashes = await File.aggregate([
      { $match: { owner: req.user._id, status: 'active' } },
      { $group: { _id: '$md5Hash', count: { $sum: 1 }, files: { $push: '$$ROOT' } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const result = await Promise.all(
      duplicateHashes.map(async (group) => {
        const filesWithUrls = await Promise.all(
          group.files.map(async (file) => {
            const url = await s3Service.getSignedUrl(file.storageKey, 3600).catch(() => null);
            return { ...file, downloadUrl: url };
          })
        );
        return {
          hash: group._id,
          count: group.count,
          totalWastedSize: group.files.slice(1).reduce((acc, f) => acc + f.size, 0),
          files: filesWithUrls,
        };
      })
    );

    const totalWasted = result.reduce((acc, g) => acc + g.totalWastedSize, 0);

    res.json({ duplicateGroups: result, totalWastedBytes: totalWasted });
  } catch (err) {
    logger.error('Get duplicates error:', err);
    res.status(500).json({ error: 'Failed to detect duplicates' });
  }
};

/**
 * @route   DELETE /api/files/:id
 * @desc    Move file to recycle bin
 */
const deleteFile = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id, status: 'active' });
    if (!file) return res.status(404).json({ error: 'File not found' });

    const now = new Date();
    const autoDeleteAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    file.status = 'recycled';
    file.deletedAt = now;
    file.autoDeleteAt = autoDeleteAt;
    await file.save();

    res.json({ message: 'File moved to recycle bin. Will be permanently deleted in 30 days.' });
  } catch (err) {
    logger.error('Delete file error:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

/**
 * @route   POST /api/files/:id/restore
 * @desc    Restore file from recycle bin
 */
const restoreFile = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id, status: 'recycled' });
    if (!file) return res.status(404).json({ error: 'File not found in recycle bin' });

    file.status = 'active';
    file.deletedAt = null;
    file.autoDeleteAt = null;
    await file.save();

    res.json({ message: 'File restored successfully', file: file.toJSON() });
  } catch (err) {
    logger.error('Restore file error:', err);
    res.status(500).json({ error: 'Failed to restore file' });
  }
};

/**
 * @route   DELETE /api/files/:id/permanent
 * @desc    Permanently delete file from storage
 */
const permanentDelete = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      owner: req.user._id,
      status: { $in: ['recycled', 'active'] },
    });
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Delete from S3
    await s3Service.deleteFile(file.storageKey).catch((err) => logger.warn('S3 delete failed:', err));

    // Update user storage
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'storage.usedBytes': -file.size },
    });

    await file.deleteOne();

    res.json({ message: 'File permanently deleted', freedBytes: file.size });
  } catch (err) {
    logger.error('Permanent delete error:', err);
    res.status(500).json({ error: 'Failed to permanently delete file' });
  }
};

/**
 * @route   POST /api/files/:id/share
 * @desc    Generate share link/code for file
 */
const shareFile = async (req, res) => {
  try {
    const { expiresInHours = 24 } = req.body;
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id, status: 'active' });
    if (!file) return res.status(404).json({ error: 'File not found' });

    const shareToken = uuidv4();
    const shareCode = generate6DigitCode();
    const shareExpiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    file.isShared = true;
    file.shareToken = shareToken;
    file.shareCode = shareCode;
    file.shareExpiresAt = shareExpiresAt;
    await file.save();

    const shareUrl = `${process.env.FRONTEND_URL}/share/${shareToken}`;

    res.json({
      shareUrl,
      shareCode,
      shareToken,
      expiresAt: shareExpiresAt,
      message: 'Share link generated. Use the 6-digit code for secure access.',
    });
  } catch (err) {
    logger.error('Share file error:', err);
    res.status(500).json({ error: 'Failed to generate share link' });
  }
};

/**
 * @route   GET /api/files/share/:token
 * @desc    Access shared file (requires 6-digit code)
 */
const accessSharedFile = async (req, res) => {
  try {
    const { token } = req.params;
    const { code } = req.query;

    const file = await File.findOne({ shareToken: token, isShared: true, status: 'active' });
    if (!file) return res.status(404).json({ error: 'Shared file not found or expired' });

    if (file.shareExpiresAt && file.shareExpiresAt < new Date()) {
      return res.status(410).json({ error: 'Share link has expired' });
    }

    if (!code || code !== file.shareCode) {
      return res.status(401).json({ error: 'Invalid 6-digit access code' });
    }

    // Generate download URL
    const downloadUrl = await s3Service.getSignedUrl(file.storageKey, 3600);
    
    file.shareAccessCount += 1;
    file.lastAccessedAt = new Date();
    await file.save();

    res.json({
      file: {
        id: file._id,
        name: file.name,
        size: file.size,
        sizeFormatted: file.sizeFormatted,
        category: file.category,
        mimeType: file.mimeType,
        thumbnailUrl: file.thumbnailUrl,
        downloadUrl,
      },
    });
  } catch (err) {
    logger.error('Access shared file error:', err);
    res.status(500).json({ error: 'Failed to access shared file' });
  }
};

/**
 * @route   GET /api/files/recycle-bin
 * @desc    Get files in recycle bin
 */
const getRecycleBin = async (req, res) => {
  try {
    const files = await File.find({ owner: req.user._id, status: 'recycled' }).sort({ deletedAt: -1 });
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    
    res.json({ files: files.map(f => f.toJSON()), totalSize, count: files.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recycle bin' });
  }
};

module.exports = {
  uploadFile, getFiles, getDuplicates, deleteFile, restoreFile,
  permanentDelete, shareFile, accessSharedFile, getRecycleBin,
};
