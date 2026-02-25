const { createAuditEvent } = require('../audit/audit.service');
const { Notification } = require('./notification.model');

async function createNotification(payload, actorUserId = 0) {
  const notification = await Notification.create({
    type: payload.type,
    severity: payload.severity,
    title: payload.title,
    message: payload.message,
    entity: payload.entity,
    meta: payload.meta || {},
    read: false,
  });

  await createAuditEvent({
    type: 'NOTIFICATION_CREATE',
    actorUserId,
    payload: {
      notificationId: notification._id.toString(),
      type: notification.type,
      entity: notification.entity,
    },
  });

  return notification;
}

async function createNotificationIfNotRecent(payload, dedupeWindowHours = 24, actorUserId = 0) {
  const since = new Date(Date.now() - dedupeWindowHours * 60 * 60 * 1000);
  const existing = await Notification.findOne({
    type: payload.type,
    'entity.kind': payload.entity.kind,
    'entity.id': payload.entity.id,
    createdAt: { $gte: since },
  }).sort({ createdAt: -1 });

  if (existing) {
    return { notification: existing, created: false };
  }

  const notification = await createNotification(payload, actorUserId);
  return { notification, created: true };
}

function buildNotificationQuery(filters, role) {
  const query = {};
  if (filters.read !== undefined) {
    query.read = filters.read;
  }
  if (filters.type) {
    query.type = filters.type;
  }
  if (filters.severity) {
    query.severity = filters.severity;
  }
  if (role === 'CASHIER') {
    query.severity = { $in: ['info', 'warning'] };
  }
  return query;
}

async function listNotifications(filters, role) {
  const limit = Math.min(Number(filters.limit || 20), 100);
  const query = buildNotificationQuery(filters, role);
  return Notification.find(query).sort({ createdAt: -1 }).limit(limit);
}

async function markNotificationRead(id) {
  return Notification.findByIdAndUpdate(id, { $set: { read: true } }, { new: true });
}

async function markAllRead(role) {
  const query = role === 'CASHIER' ? { severity: { $in: ['info', 'warning'] } } : {};
  const result = await Notification.updateMany(query, { $set: { read: true } });
  return {
    matched: result.matchedCount ?? result.n ?? 0,
    modified: result.modifiedCount ?? result.nModified ?? 0,
  };
}

async function getSummary(role) {
  const baseMatch = role === 'CASHIER' ? { severity: { $in: ['info', 'warning'] } } : {};
  const unreadMatch = { ...baseMatch, read: false };

  const [unread_total, unread_by_severity_raw, top_recent] = await Promise.all([
    Notification.countDocuments(unreadMatch),
    Notification.aggregate([
      { $match: unreadMatch },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]),
    Notification.find(baseMatch).sort({ createdAt: -1 }).limit(10),
  ]);

  const unread_by_severity = { info: 0, warning: 0, critical: 0 };
  for (const row of unread_by_severity_raw) {
    unread_by_severity[row._id] = row.count;
  }
  if (role === 'CASHIER') {
    unread_by_severity.critical = 0;
  }

  return { unread_total, unread_by_severity, top_recent };
}

module.exports = {
  createNotification,
  createNotificationIfNotRecent,
  listNotifications,
  markNotificationRead,
  markAllRead,
  getSummary,
};
