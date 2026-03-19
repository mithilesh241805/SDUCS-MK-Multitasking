const Razorpay = require('razorpay');
const crypto = require('crypto');
const QRCode = require('qrcode');
const Payment = require('../models/Payment');
const User = require('../models/User');
const s3Service = require('../services/s3');
const logger = require('../utils/logger');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLANS = Payment.statics ? Payment.statics.PLANS : require('../models/Payment').schema.statics.PLANS;

// Import PLANS directly
const PLAN_DATA = {
  lite: { name: 'Lite', dataBytes: 5 * 1024 * 1024 * 1024, price: 25, days: 2 },
  premium: { name: 'Premium', dataBytes: 10 * 1024 * 1024 * 1024, price: 49, days: 4 },
  pro: { name: 'Pro', dataBytes: 20 * 1024 * 1024 * 1024, price: 99, days: 6 },
  pro_max: { name: 'Pro Max', dataBytes: 50 * 1024 * 1024 * 1024, price: 200, days: 8 },
};

/**
 * @route   POST /api/payments/create-order
 * @desc    Create Razorpay order + generate UPI QR
 */
const createOrder = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLAN_DATA[plan]) return res.status(400).json({ error: 'Invalid plan' });

    const planInfo = PLAN_DATA[plan];
    const amountPaise = planInfo.price * 100; // Convert to paise

    // Create Razorpay order
    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: `sducs_${Date.now()}`,
        notes: {
          userId: req.user._id.toString(),
          plan,
          email: req.user.email,
        },
      });
    } catch (rzErr) {
      logger.warn('Razorpay order creation failed, using fallback:', rzErr.message);
      razorpayOrder = null;
    }

    // Generate UPI deeplink QR
    const qrExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    const upiAmount = planInfo.price.toFixed(2);
    
    let qrCodeDataUrl;
    let upiString;
    
    if (razorpayOrder) {
      // Razorpay UPI QR (dynamic)
      upiString = `upi://pay?pa=${process.env.FALLBACK_UPI_ID}&pn=SDUCS+MK&am=${upiAmount}&cu=INR&tn=SDUCS-${plan.toUpperCase()}&tr=${razorpayOrder.id}`;
    } else {
      // Fallback static UPI QR
      upiString = `upi://pay?pa=${process.env.FALLBACK_UPI_ID}&pn=SDUCS+MK&am=${upiAmount}&cu=INR&tn=SDUCS-${plan.toUpperCase()}`;
    }
    
    qrCodeDataUrl = await QRCode.toDataURL(upiString, {
      width: 300,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });

    // Create payment record
    const payment = await Payment.create({
      user: req.user._id,
      plan,
      amount: amountPaise,
      razorpayOrderId: razorpayOrder?.id,
      qrCodeData: qrCodeDataUrl,
      qrExpiresAt,
      isFallback: !razorpayOrder,
      status: 'pending',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      paymentId: payment._id,
      razorpayOrderId: razorpayOrder?.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      qrCodeData: qrCodeDataUrl,
      qrExpiresAt,
      plan: planInfo,
      amount: planInfo.price,
      isFallback: !razorpayOrder,
      fallbackUpiQR: !razorpayOrder, // Show fallback QR
      message: razorpayOrder
        ? 'Scan QR to pay. Payment will be auto-verified.'
        : 'Scan QR to pay, then upload payment screenshot for verification.',
    });
  } catch (err) {
    logger.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
};

/**
 * @route   POST /api/payments/verify
 * @desc    Verify Razorpay payment (client-side)
 */
const verifyPayment = async (req, res) => {
  try {
    const { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const payment = await Payment.findOne({ _id: paymentId, user: req.user._id });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    if (payment.status === 'completed') {
      return res.status(409).json({ error: 'Payment already processed' });
    }

    // Credit user
    await creditUser(payment);

    res.json({
      message: 'Payment verified! Your account has been credited.',
      plan: payment.plan,
      dataGranted: payment.dataGranted,
    });
  } catch (err) {
    logger.error('Verify payment error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
};

/**
 * @route   POST /api/payments/webhook
 * @desc    Razorpay webhook handler
 */
const webhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== expectedSig) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body;
    logger.info('Razorpay webhook event:', event.event);

    if (event.event === 'payment.captured') {
      const { order_id, id: razorpayPaymentId } = event.payload.payment.entity;
      
      const payment = await Payment.findOne({ razorpayOrderId: order_id, status: 'pending' });
      if (payment) {
        payment.razorpayPaymentId = razorpayPaymentId;
        payment.webhookPayload = event;
        await creditUser(payment);

        // Notify user via socket
        // (io is not directly accessible here but we can use a service)
        logger.info(`Payment credited for user ${payment.user} via webhook`);
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * @route   POST /api/payments/fallback-upload
 * @desc    Upload screenshot for manual verification
 */
const uploadScreenshot = async (req, res) => {
  try {
    const { paymentId } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Screenshot required' });

    const payment = await Payment.findOne({ _id: paymentId, user: req.user._id, isFallback: true });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    // Upload screenshot to S3
    const key = `screenshots/${req.user._id}/${Date.now()}-screenshot.jpg`;
    await s3Service.uploadFile({
      key,
      buffer: req.file.buffer,
      contentType: req.file.mimetype,
    });

    const screenshotUrl = await s3Service.getSignedUrl(key, 3600 * 24 * 7);

    payment.screenshotUrl = screenshotUrl;
    payment.screenshotKey = key;
    payment.status = 'awaiting_verification';
    await payment.save();

    res.json({
      message: 'Screenshot uploaded. Admin will verify your payment within 2-4 hours.',
      paymentId: payment._id,
    });
  } catch (err) {
    logger.error('Fallback upload error:', err);
    res.status(500).json({ error: 'Screenshot upload failed' });
  }
};

/**
 * @route   POST /api/payments/admin/approve/:paymentId
 * @desc    Admin: approve fallback payment
 */
const adminApprovePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    if (payment.status !== 'awaiting_verification') {
      return res.status(400).json({ error: 'Payment is not pending verification' });
    }

    payment.verifiedBy = req.user._id;
    payment.verifiedAt = new Date();
    payment.adminVerificationNote = req.body.note || 'Approved by admin';

    await creditUser(payment);

    res.json({ message: 'Payment approved and user credited', payment });
  } catch (err) {
    logger.error('Admin approve error:', err);
    res.status(500).json({ error: 'Failed to approve payment' });
  }
};

/**
 * @route   GET /api/payments/history
 * @desc    Get payment history
 */
const getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
};

// Helper: Credit user after successful payment
const creditUser = async (payment) => {
  const planInfo = PLAN_DATA[payment.plan];
  if (!planInfo) throw new Error(`Unknown plan: ${payment.plan}`);

  const user = await User.findById(payment.user);
  if (!user) throw new Error('User not found');

  // Add download data
  user.downloadData.totalBytes += planInfo.dataBytes;
  
  // Update subscription
  const now = new Date();
  const currentExpiry = user.subscription.expiresAt && user.subscription.expiresAt > now
    ? user.subscription.expiresAt
    : now;
  
  const newExpiry = new Date(currentExpiry.getTime() + planInfo.days * 24 * 60 * 60 * 1000);
  user.subscription.plan = payment.plan;
  user.subscription.expiresAt = newExpiry;
  user.subscription.addedBytes += planInfo.dataBytes;

  await user.save();

  payment.status = 'completed';
  payment.dataGranted = planInfo.dataBytes;
  await payment.save();

  return user;
};

module.exports = {
  createOrder, verifyPayment, webhook, uploadScreenshot,
  adminApprovePayment, getPaymentHistory,
};
