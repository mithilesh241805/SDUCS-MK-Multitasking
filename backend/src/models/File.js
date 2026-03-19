const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // File Info
  name: { type: String, required: true, trim: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  extension: { type: String, lowercase: true },
  size: { type: Number, required: true }, // bytes
  category: {
    type: String,
    enum: ['image', 'video', 'audio', 'document', 'archive', 'other'],
    default: 'other',
  },

  // Storage
  storageProvider: { type: String, enum: ['s3', 'firebase', 'local'], default: 's3' },
  storageKey: { type: String, required: true }, // S3 key or Firebase path
  downloadUrl: { type: String },
  thumbnailUrl: { type: String },

  // Hash for duplicate detection
  md5Hash: { type: String, index: true },
  sha256Hash: { type: String },

  // Encryption
  isEncrypted: { type: Boolean, default: true },
  encryptionIV: { type: String, select: false },

  // Sharing
  isShared: { type: Boolean, default: false },
  shareToken: { type: String, unique: true, sparse: true },
  shareCode: { type: String }, // 6-digit code
  shareExpiresAt: { type: Date },
  shareAccessCount: { type: Number, default: 0 },
  shareMaxAccess: { type: Number, default: 0 }, // 0 = unlimited

  // State
  status: {
    type: String,
    enum: ['active', 'deleted', 'recycled', 'processing'],
    default: 'active',
  },

  // Recycle bin
  deletedAt: { type: Date },
  autoDeleteAt: { type: Date }, // 30 days after deletion

  // Metadata
  tags: [{ type: String }],
  description: { type: String, trim: true },
  
  // AI Data
  aiLabels: [{ type: String }],
  isDuplicate: { type: Boolean, default: false },
  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'File', default: null },
  
  // Media metadata
  duration: { type: Number }, // seconds for audio/video
  width: { type: Number }, // pixels for images/video
  height: { type: Number },
  
  // Access
  lastAccessedAt: { type: Date },
  downloadCount: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
fileSchema.index({ owner: 1, status: 1 });
fileSchema.index({ owner: 1, category: 1 });
fileSchema.index({ md5Hash: 1, owner: 1 });
fileSchema.index({ shareToken: 1 });
fileSchema.index({ status: 1, autoDeleteAt: 1 }); // For cron job
fileSchema.index({ owner: 1, createdAt: -1 });

// Virtual: human-readable size
fileSchema.virtual('sizeFormatted').get(function () {
  const bytes = this.size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
});

module.exports = mongoose.model('File', fileSchema);
