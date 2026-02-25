const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    entity: {
      kind: {
        type: String,
        enum: ['variant', 'layaway', 'settings', 'product'],
        required: true,
      },
      id: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: 'notifications',
    timestamps: { createdAt: true, updatedAt: false },
  }
);

notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ read: 1 });

const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

module.exports = { Notification };
