const mongoose = require('mongoose');

const downloadSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // URL & File Info
  url: { type: String, required: true },
  finalUrl: { type: String }, // After redirects
  fileName: { type: String, required: true },
  mimeType: { type: String },
  category: { type: String, enum: ['image', 'video', 'audio', 'document', 'archive', 'other'], default: 'other' },
  fileSize: { type: Number }, // bytes (resolved)
  
  // Quality (for video/audio)
  availableQualities: [{ label: String, url: String, size: Number }],
  selectedQuality: { type: String },
  
  // Progress
  status: {
    type: String,
    enum: ['queued', 'downloading', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'queued',
  },
  progress: { type: Number, default: 0 }, // 0-100
  downloadedBytes: { type: Number, default: 0 },
  speed: { type: Number, default: 0 }, // bytes/second
  
  // Storage
  savedFileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File' }, // If saved to cloud
  savedLocally: { type: Boolean, default: false },
  
  // Data deduction
  dataDeducted: { type: Number, default: 0 }, // bytes deducted
  
  // Metadata
  errorMessage: { type: String },
  startedAt: { type: Date },
  completedAt: { type: Date },
  
  // Preview
  previewUrl: { type: String },
  previewType: { type: String }, // 'image', 'video', 'audio', 'pdf'
}, {
  timestamps: true,
});

downloadSchema.index({ user: 1, status: 1 });
downloadSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Download', downloadSchema);
