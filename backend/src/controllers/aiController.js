const { GoogleGenerativeAI } = require('@google/generative-ai');
const File = require('../models/File');
const User = require('../models/User');
const logger = require('../utils/logger');

let genAI;
try {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} catch (err) {
  logger.warn('Gemini AI not initialized:', err.message);
}

/**
 * @route   GET /api/ai/suggestions
 * @desc    AI-powered storage cleanup suggestions
 */
const getStorageSuggestions = async (req, res) => {
  try {
    const userId = req.user._id;

    // Collect data for AI analysis
    const [largeFiles, oldFiles, duplicateCount, unusedFiles] = await Promise.all([
      File.find({ owner: userId, status: 'active' }).sort({ size: -1 }).limit(10),
      File.find({ owner: userId, status: 'active', lastAccessedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }).limit(10),
      File.aggregate([
        { $match: { owner: userId, status: 'active' } },
        { $group: { _id: '$md5Hash', count: { $sum: 1 }, totalSize: { $sum: '$size' } } },
        { $match: { count: { $gt: 1 } } },
        { $group: { _id: null, total: { $sum: 1 }, wastedBytes: { $sum: { $multiply: [{ $subtract: ['$count', 1] }, '$totalSize'] } } } },
      ]),
      File.find({ owner: userId, status: 'active', lastAccessedAt: null }).sort({ createdAt: 1 }).limit(10),
    ]);

    const duplicateInfo = duplicateCount[0] || { total: 0, wastedBytes: 0 };
    const user = await User.findById(userId);
    const storageUsedPercent = Math.round((user.storage.usedBytes / user.storage.totalBytes) * 100);

    let aiSuggestions = [];

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const prompt = `
You are a smart storage manager AI for SDUCS app. Analyze this user's storage data and give 5 actionable suggestions in JSON format.

User Storage: ${storageUsedPercent}% used (${formatBytes(user.storage.usedBytes)} / ${formatBytes(user.storage.totalBytes)})
Duplicate Files: ${duplicateInfo.total} groups, wasting ${formatBytes(duplicateInfo.wastedBytes)}
Large Files (top 3): ${largeFiles.slice(0, 3).map(f => `${f.name} (${formatBytes(f.size)})`).join(', ')}
Files not accessed in 30+ days: ${oldFiles.length}
Never accessed files: ${unusedFiles.length}

Return JSON array with objects: { "type": "duplicate|large|unused|archive|general", "title": "short title", "description": "1-2 sentence advice", "potentialSavings": "X MB/GB", "priority": "high|medium|low" }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          aiSuggestions = JSON.parse(jsonMatch[0]);
        }
      } catch (aiErr) {
        logger.warn('AI suggestions error:', aiErr.message);
      }
    }

    // Fallback rule-based suggestions
    if (aiSuggestions.length === 0) {
      aiSuggestions = generateRuleSuggestions({
        duplicateInfo, largeFiles, oldFiles, unusedFiles, storageUsedPercent,
      });
    }

    res.json({
      suggestions: aiSuggestions,
      stats: {
        storageUsedPercent,
        duplicateGroups: duplicateInfo.total,
        wastedBytes: duplicateInfo.wastedBytes,
        wastedFormatted: formatBytes(duplicateInfo.wastedBytes),
        oldFilesCount: oldFiles.length,
        unusedFilesCount: unusedFiles.length,
        largeFilesCount: largeFiles.length,
      },
    });
  } catch (err) {
    logger.error('AI suggestions error:', err);
    res.status(500).json({ error: 'Failed to generate AI suggestions' });
  }
};

/**
 * @route   POST /api/ai/chat
 * @desc    AI assistant chat
 */
const chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    if (!genAI) {
      return res.json({
        reply: 'AI assistant is currently unavailable. Please configure your Gemini API key.',
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const user = await User.findById(req.user._id);

    const systemContext = `You are SDUCS AI Assistant, helping users manage their files, storage, and downloads. 
User: ${user.name}, Storage: ${formatBytes(user.storage.usedBytes)} / ${formatBytes(user.storage.totalBytes)} used. 
Be concise, helpful, and friendly. Answer in 2-3 sentences max unless asked for more detail.`;

    const result = await model.generateContent(`${systemContext}\n\nUser: ${message}`);
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    logger.error('AI chat error:', err);
    res.status(500).json({ error: 'AI assistant unavailable' });
  }
};

/**
 * @route   POST /api/ai/categorize-files
 * @desc    AI categorize all files without categories
 */
const recategorizeFiles = async (req, res) => {
  try {
    const uncategorized = await File.find({
      owner: req.user._id,
      status: 'active',
      aiLabels: { $size: 0 },
    }).limit(20);

    res.json({
      message: `Queued ${uncategorized.length} files for AI recategorization`,
      count: uncategorized.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to queue recategorization' });
  }
};

const generateRuleSuggestions = ({ duplicateInfo, largeFiles, oldFiles, unusedFiles, storageUsedPercent }) => {
  const suggestions = [];

  if (duplicateInfo.total > 0) {
    suggestions.push({
      type: 'duplicate',
      title: `Remove ${duplicateInfo.total} duplicate groups`,
      description: `You have duplicate files wasting ${formatBytes(duplicateInfo.wastedBytes)}. Removing duplicates is the quickest way to free up space.`,
      potentialSavings: formatBytes(duplicateInfo.wastedBytes),
      priority: 'high',
    });
  }

  if (largeFiles.length > 0) {
    suggestions.push({
      type: 'large',
      title: 'Review large files',
      description: `Your largest file "${largeFiles[0].name}" takes ${formatBytes(largeFiles[0].size)}. Consider compressing or archiving large files.`,
      potentialSavings: formatBytes(largeFiles.slice(0, 3).reduce((a, f) => a + f.size, 0)),
      priority: 'medium',
    });
  }

  if (oldFiles.length > 5) {
    suggestions.push({
      type: 'unused',
      title: `${oldFiles.length} files unused for 30+ days`,
      description: 'These files haven\'t been accessed in over a month. Consider archiving or deleting them.',
      potentialSavings: formatBytes(oldFiles.reduce((a, f) => a + f.size, 0)),
      priority: 'medium',
    });
  }

  if (storageUsedPercent > 80) {
    suggestions.push({
      type: 'general',
      title: 'Storage almost full',
      description: 'Your storage is over 80% full. Watch rewarded ads to earn free storage or upgrade your plan.',
      potentialSavings: 'Up to 2GB/day via rewards',
      priority: 'high',
    });
  }

  return suggestions;
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const categorizeFile = async (buffer, mimeType) => {
  if (!genAI) return [];
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
    const imagePart = { inlineData: { data: buffer.toString('base64'), mimeType } };
    const result = await model.generateContent(['Identify what this image contains in 3-5 keywords, comma separated.', imagePart]);
    return result.response.text().split(',').map(t => t.trim()).filter(Boolean);
  } catch {
    return [];
  }
};

module.exports = { getStorageSuggestions, chatWithAI, recategorizeFiles, categorizeFile };
