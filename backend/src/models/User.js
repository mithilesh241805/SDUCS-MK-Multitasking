const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const STORAGE_BONUS_BYTES = 30 * 1024 * 1024 * 1024; // 30GB signup bonus
const DOWNLOAD_BONUS_BYTES = 10 * 1024 * 1024 * 1024; // 10GB download bonus
const MAX_STORAGE_BYTES = 100 * 1024 * 1024 * 1024; // 100GB max cap

const userSchema = new mongoose.Schema({
  uid: { type: String, unique: true, sparse: true }, // Firebase UID
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, select: false },
  photoURL: { type: String, default: '' },
  authProvider: { type: String, enum: ['email', 'google', 'firebase'], default: 'email' },

  // Storage
  storage: {
    totalBytes: { type: Number, default: STORAGE_BONUS_BYTES },
    usedBytes: { type: Number, default: 0 },
    maxBytes: { type: Number, default: MAX_STORAGE_BYTES },
    dailyRewardEarned: { type: Number, default: 0 },     // Bytes earned today via ads
    dailyRewardCap: { type: Number, default: 2 * 1024 * 1024 * 1024 }, // 2GB daily cap
    lastRewardDate: { type: Date },
  },

  // Download Data
  downloadData: {
    totalBytes: { type: Number, default: DOWNLOAD_BONUS_BYTES },
    usedBytes: { type: Number, default: 0 },
  },

  // Subscription
  subscription: {
    plan: { type: String, enum: ['free', 'lite', 'premium', 'pro', 'pro_max'], default: 'free' },
    expiresAt: { type: Date },
    addedBytes: { type: Number, default: 0 },
  },

  // Ads tracking
  ads: {
    dailyCount: { type: Number, default: 0 },
    dailyLimit: { type: Number, default: 10 },
    lastAdDate: { type: Date },
    totalAdsWatched: { type: Number, default: 0 },
    suspiciousActivity: { type: Boolean, default: false },
  },

  // Security
  isEmailVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, select: false },

  // Role
  role: { type: String, enum: ['user', 'admin'], default: 'user' },

  // Metadata
  lastLoginAt: { type: Date },
  loginCount: { type: Number, default: 0 },
  deviceTokens: [{ type: String }], // FCM tokens
  
  // Profile
  avatarColor: { type: String, default: '#7C3AED' },
  theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual: available storage
userSchema.virtual('storage.availableBytes').get(function () {
  return Math.max(0, this.storage.totalBytes - this.storage.usedBytes);
});

// Virtual: storage percentage
userSchema.virtual('storage.usedPercent').get(function () {
  if (this.storage.totalBytes === 0) return 100;
  return Math.round((this.storage.usedBytes / this.storage.totalBytes) * 100);
});

// Virtual: download data available
userSchema.virtual('downloadData.availableBytes').get(function () {
  return Math.max(0, this.downloadData.totalBytes - this.downloadData.usedBytes);
});

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Reset daily ad count if new day
userSchema.methods.resetDailyAdsIfNeeded = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (!this.ads.lastAdDate || this.ads.lastAdDate < today) {
    this.ads.dailyCount = 0;
    this.ads.lastAdDate = new Date();
  }
  
  if (!this.storage.lastRewardDate || this.storage.lastRewardDate < today) {
    this.storage.dailyRewardEarned = 0;
    this.storage.lastRewardDate = new Date();
  }
};

// Add storage with cap enforcement
userSchema.methods.addStorage = function (bytes) {
  const newTotal = Math.min(this.storage.totalBytes + bytes, MAX_STORAGE_BYTES);
  const added = newTotal - this.storage.totalBytes;
  this.storage.totalBytes = newTotal;
  return added;
};

userSchema.index({ email: 1 });
userSchema.index({ uid: 1 });
userSchema.index({ 'subscription.expiresAt': 1 });

module.exports = mongoose.model('User', userSchema);
