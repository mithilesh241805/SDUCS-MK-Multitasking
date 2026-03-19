const mongoose = require('mongoose');

const PLANS = {
  lite: { name: 'Lite', dataBytes: 5 * 1024 * 1024 * 1024, price: 25, days: 2 },
  premium: { name: 'Premium', dataBytes: 10 * 1024 * 1024 * 1024, price: 49, days: 4 },
  pro: { name: 'Pro', dataBytes: 20 * 1024 * 1024 * 1024, price: 99, days: 6 },
  pro_max: { name: 'Pro Max', dataBytes: 50 * 1024 * 1024 * 1024, price: 200, days: 8 },
};

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: String, enum: Object.keys(PLANS), required: true },
  
  // Amount
  amount: { type: Number, required: true }, // in INR paise (×100 for Razorpay)
  currency: { type: String, default: 'INR' },
  
  // Razorpay
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  
  // QR Code (for Razorpay UPI)
  qrCodeData: { type: String },
  qrExpiresAt: { type: Date },
  
  // Fallback UPI
  isFallback: { type: Boolean, default: false },
  screenshotUrl: { type: String },
  screenshotKey: { type: String },
  adminVerificationNote: { type: String },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled', 'awaiting_verification'],
    default: 'pending',
  },
  
  // Data
  dataGranted: { type: Number }, // bytes granted after payment
  
  // Webhook
  webhookPayload: { type: mongoose.Schema.Types.Mixed },
  
  // Metadata
  ipAddress: { type: String },
  userAgent: { type: String },
  failureReason: { type: String },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

paymentSchema.virtual('amountInRupees').get(function () {
  return this.amount / 100;
});

paymentSchema.statics.PLANS = PLANS;

paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ status: 1, qrExpiresAt: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
