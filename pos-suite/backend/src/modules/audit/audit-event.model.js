const mongoose = require('mongoose');

const auditEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },
    actorUserId: {
      type: Number,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: 'audit_events',
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const AuditEvent = mongoose.models.AuditEvent || mongoose.model('AuditEvent', auditEventSchema);

module.exports = { AuditEvent };
