const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.use(protect);

// Storage info
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      storage: {
        usedBytes: user.storage.usedBytes,
        totalBytes: user.storage.totalBytes,
        availableBytes: user.storage.totalBytes - user.storage.usedBytes,
        maxBytes: user.storage.maxBytes,
        usedPercent: Math.round((user.storage.usedBytes / user.storage.totalBytes) * 100),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch storage info' });
  }
});

module.exports = router;
