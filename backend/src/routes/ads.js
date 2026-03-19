const express = require('express');
const router = express.Router();
const { completeRewardedAd, recordInterstitialAd, getAdStats, getRevenueAnalytics } = require('../controllers/adController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.post('/rewarded/complete', completeRewardedAd);
router.post('/interstitial/record', recordInterstitialAd);
router.get('/stats', getAdStats);

// Admin
router.get('/admin/revenue', adminOnly, getRevenueAnalytics);

module.exports = router;
