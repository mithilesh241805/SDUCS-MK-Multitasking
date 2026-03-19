const mongoose = require('mongoose');

const adEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  adType: { type: String, enum: ['rewarded', 'interstitial'], required: true },
  adUnit: { type: String },
  
  // Reward
  rewardType: { type: String, enum: ['storage', 'download_data'], default: 'storage' },
  rewardBytes: { type: Number, default: 0 },
  
  // Revenue estimation
  estimatedRevenue: { type: Number, default: 0 }, // in INR
  eCPM: { type: Number, default: 0 },
  
  // Anti-abuse
  deviceId: { type: String },
  ipAddress: { type: String },
  sessionId: { type: String },
  isSuspicious: { type: Boolean, default: false },
  suspiciousReason: { type: String },
  
  // Status
  status: { type: String, enum: ['completed', 'partially_viewed', 'skipped', 'invalid'], default: 'completed' },
  viewDuration: { type: Number }, // seconds
  
  // Timestamp
  viewedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

adEventSchema.index({ user: 1, viewedAt: -1 });
adEventSchema.index({ user: 1, adType: 1 });
adEventSchema.index({ ipAddress: 1, viewedAt: -1 }); // Anti-abuse

// Static: estimate revenue based on eCPM
adEventSchema.statics.estimateRevenue = function (adType) {
  const rates = {
    rewarded: { min: 0.20, max: 2.0 }, // INR per view (India avg)
    interstitial: { min: 0.05, max: 0.50 },
  };
  const rate = rates[adType] || rates.rewarded;
  return +(Math.random() * (rate.max - rate.min) + rate.min).toFixed(4);
};

// Static: calculate storage reward
adEventSchema.statics.calculateStorageReward = function () {
  const minMB = 100 * 1024 * 1024;
  const maxMB = 500 * 1024 * 1024;
  return Math.floor(Math.random() * (maxMB - minMB) + minMB);
};

module.exports = mongoose.model('AdEvent', adEventSchema);
