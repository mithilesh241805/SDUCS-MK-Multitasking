const axios = require('axios');
const https = require('https');
const url = require('url');
const mime = require('mime-types');
const Download = require('../models/Download');
const User = require('../models/User');
const logger = require('../utils/logger');

const BLOCKED_DOMAINS = ['youtube.com', 'youtu.be', 'instagram.com', 'facebook.com', 'tiktok.com'];

const isValidDirectUrl = (urlStr) => {
  try {
    const parsed = new URL(urlStr);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const blocked = BLOCKED_DOMAINS.some(d => parsed.hostname.includes(d));
    if (blocked) return false;
    return true;
  } catch {
    return false;
  }
};

const detectFileType = (headers, urlStr) => {
  const contentType = headers['content-type'] || '';
  const mimeType = contentType.split(';')[0].trim();
  
  if (mimeType && mimeType !== 'application/octet-stream') {
    return { mimeType, extension: mime.extension(mimeType) };
  }
  
  // Detect from URL
  const pathname = new URL(urlStr).pathname;
  const ext = pathname.split('.').pop().toLowerCase();
  const detectedMime = mime.lookup(ext) || 'application/octet-stream';
  
  return { mimeType: detectedMime, extension: ext };
};

const getCategory = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('text')) return 'document';
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar')) return 'archive';
  return 'other';
};

/**
 * @route   POST /api/downloads/analyze
 * @desc    Analyze download URL, return file info before downloading
 */
const analyzeUrl = async (req, res) => {
  try {
    const { url: downloadUrl } = req.body;

    if (!isValidDirectUrl(downloadUrl)) {
      return res.status(400).json({
        error: 'Invalid URL. Only direct downloadable links are supported.',
        hint: 'Please provide a direct file URL (not YouTube, Instagram, etc.)',
      });
    }

    // HEAD request to get file info
    let headers = {};
    let finalUrl = downloadUrl;
    
    try {
      const response = await axios({
        method: 'HEAD',
        url: downloadUrl,
        timeout: 10000,
        maxRedirects: 5,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SDUCS-Bot/1.0)' },
      });
      headers = response.headers;
      finalUrl = response.request.res.responseUrl || downloadUrl;
    } catch (headErr) {
      // Try GET with range 0-0 if HEAD fails
      try {
        const response = await axios({
          method: 'GET',
          url: downloadUrl,
          timeout: 10000,
          headers: { Range: 'bytes=0-0', 'User-Agent': 'Mozilla/5.0' },
          maxRedirects: 5,
        });
        headers = response.headers;
      } catch (getErr) {
        return res.status(400).json({ error: 'Cannot access URL. Please verify it is a direct downloadable link.' });
      }
    }

    const contentLength = parseInt(headers['content-length'] || '0');
    const { mimeType, extension } = detectFileType(headers, finalUrl);
    const category = getCategory(mimeType);

    // Extract filename from URL or Content-Disposition
    let fileName = 'download';
    const contentDisposition = headers['content-disposition'] || '';
    const cdMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (cdMatch) {
      fileName = cdMatch[1].replace(/['"]/g, '').trim();
    } else {
      const pathname = new URL(finalUrl).pathname;
      const parts = pathname.split('/');
      fileName = parts[parts.length - 1] || `file.${extension}`;
    }

    // Check user has enough data
    const user = await User.findById(req.user._id);
    const hasEnoughData = user.downloadData.availableBytes >= contentLength;

    let previewUrl = null;
    let previewType = null;
    if (['image', 'video', 'audio'].includes(category)) {
      previewUrl = finalUrl;
      previewType = category;
    }

    res.json({
      url: finalUrl,
      fileName,
      mimeType,
      extension,
      category,
      fileSize: contentLength,
      fileSizeFormatted: formatBytes(contentLength),
      hasEnoughData,
      availableData: user.downloadData.availableBytes,
      previewUrl,
      previewType,
    });
  } catch (err) {
    logger.error('Analyze URL error:', err);
    res.status(500).json({ error: 'URL analysis failed' });
  }
};

/**
 * @route   POST /api/downloads/start
 * @desc    Start download
 */
const startDownload = async (req, res) => {
  try {
    const { url: downloadUrl, fileName, mimeType, fileSize, category } = req.body;

    if (!isValidDirectUrl(downloadUrl)) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    const user = await User.findById(req.user._id);

    if (fileSize && user.downloadData.availableBytes < fileSize) {
      return res.status(402).json({
        error: 'Insufficient download data',
        required: fileSize,
        available: user.downloadData.availableBytes,
        message: 'Purchase a plan or watch rewarded ads to get more data.',
      });
    }

    // Create download record
    const download = await Download.create({
      user: req.user._id,
      url: downloadUrl,
      fileName: fileName || 'download',
      mimeType: mimeType || 'application/octet-stream',
      category: category || 'other',
      fileSize: fileSize || 0,
      status: 'queued',
    });

    // Deduct data immediately (estimates; adjust on completion)
    if (fileSize) {
      user.downloadData.usedBytes += fileSize;
      await user.save();
    }

    res.status(201).json({
      message: 'Download queued',
      downloadId: download._id,
      download: download.toJSON(),
    });
  } catch (err) {
    logger.error('Start download error:', err);
    res.status(500).json({ error: 'Failed to start download' });
  }
};

/**
 * @route   GET /api/downloads
 * @desc    Get download history
 */
const getDownloads = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { user: req.user._id };
    if (status) query.status = status;

    const [downloads, total] = await Promise.all([
      Download.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit),
      Download.countDocuments(query),
    ]);

    res.json({
      downloads,
      pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch downloads' });
  }
};

/**
 * @route   DELETE /api/downloads/:id
 * @desc    Cancel download
 */
const cancelDownload = async (req, res) => {
  try {
    const download = await Download.findOne({ _id: req.params.id, user: req.user._id });
    if (!download) return res.status(404).json({ error: 'Download not found' });

    if (['completed', 'cancelled'].includes(download.status)) {
      return res.status(400).json({ error: 'Cannot cancel a completed/cancelled download' });
    }

    // Refund data if not completed
    if (download.fileSize && download.status !== 'completed') {
      const refund = download.fileSize - download.downloadedBytes;
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { 'downloadData.usedBytes': -refund },
      });
    }

    download.status = 'cancelled';
    await download.save();

    res.json({ message: 'Download cancelled', refundedBytes: download.fileSize - download.downloadedBytes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel download' });
  }
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

module.exports = { analyzeUrl, startDownload, getDownloads, cancelDownload };
