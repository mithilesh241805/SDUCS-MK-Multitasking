const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  createOrder, verifyPayment, webhook, uploadScreenshot,
  adminApprovePayment, getPaymentHistory,
} = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');

const screenshotUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Razorpay webhook (no auth)
router.post('/webhook', express.raw({ type: 'application/json' }), webhook);

router.use(protect);
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.post('/fallback-upload', screenshotUpload.single('screenshot'), uploadScreenshot);
router.get('/history', getPaymentHistory);

// Admin
router.post('/admin/approve/:paymentId', adminOnly, adminApprovePayment);

module.exports = router;
