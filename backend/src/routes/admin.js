const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Payment = require('../models/Payment');
const File = require('../models/File');
const AdEvent = require('../models/AdEvent');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

// Overview stats
router.get('/stats', async (req, res) => {
  try {
    const [users, files, payments, ads] = await Promise.all([
      User.aggregate([{ $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } }]),
      File.aggregate([{ $group: { _id: null, total: { $sum: 1 }, totalSize: { $sum: '$size' } } }]),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: 1 }, revenue: { $sum: '$amount' } } },
      ]),
      AdEvent.aggregate([{ $group: { _id: null, total: { $sum: 1 }, revenue: { $sum: '$estimatedRevenue' } } }]),
    ]);

    res.json({
      users: users[0] || {},
      files: files[0] || {},
      payments: { ...payments[0], revenueINR: (payments[0]?.revenue || 0) / 100 },
      ads: ads[0] || {},
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Pending fallback payments
router.get('/pending-payments', async (req, res) => {
  try {
    const payments = await Payment.find({ status: 'awaiting_verification' })
      .populate('user', 'name email')
      .sort({ createdAt: 1 });
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending payments' });
  }
});

// All users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};
    if (search) {
      query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    }
    const users = await User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit);
    const total = await User.countDocuments(query);
    res.json({ users, total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Ban/Unban user
router.patch('/users/:id/ban', async (req, res) => {
  try {
    const { ban, reason } = req.body;
    await User.findByIdAndUpdate(req.params.id, {
      isBanned: ban,
      banReason: ban ? reason || 'Violation of terms' : null,
    });
    res.json({ message: ban ? 'User banned' : 'User unbanned' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

module.exports = router;
