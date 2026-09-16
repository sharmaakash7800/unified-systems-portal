const mongoose = require('mongoose');

const SystemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    icon: {
      type: String,
      default: 'grid', // Lucide or standard icon name
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'Core Operations',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    requiredPermission: {
      type: String,
      default: '', // e.g., 'supply-pms.access'
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('System', SystemSchema);
