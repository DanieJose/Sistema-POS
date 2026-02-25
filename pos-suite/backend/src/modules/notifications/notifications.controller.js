const notificationsService = require('./notifications.service');

async function listNotifications(req, res) {
  const rows = await notificationsService.listNotifications(
    {
      read:
        req.query.read === undefined
          ? undefined
          : req.query.read === 'true' || req.query.read === true,
      type: req.query.type,
      severity: req.query.severity,
      limit: req.query.limit,
    },
    req.user.role
  );
  return res.json({ ok: true, data: rows });
}

async function markRead(req, res) {
  const row = await notificationsService.markNotificationRead(req.params.id);
  if (!row) return res.status(404).json({ ok: false, message: 'Notification not found' });
  return res.json({ ok: true, data: row });
}

async function readAll(req, res) {
  const result = await notificationsService.markAllRead(req.user.role);
  return res.json({ ok: true, data: result });
}

async function summary(req, res) {
  const data = await notificationsService.getSummary(req.user.role);
  return res.json({ ok: true, data });
}

module.exports = { listNotifications, markRead, readAll, summary };
