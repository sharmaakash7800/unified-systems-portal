const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'Universal Enterprise',
    },
    shortName: {
      type: String,
      trim: true,
      default: 'UE',
    },
    logoUrl: {
      type: String,
      default: '',
    },
    branding: {
      primaryColor: {
        type: String,
        default: '#2563eb', // Clean enterprise blue
      },
      portalTitle: {
        type: String,
        default: 'Unified Systems Portal',
      },
    },
    contactEmail: {
      type: String,
      trim: true,
      default: 'admin@portal.local',
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', OrganizationSchema);
