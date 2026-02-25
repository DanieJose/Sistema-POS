const { AuditEvent } = require('./audit-event.model');

async function createAuditEvent({ type, actorUserId, payload }) {
  try {
    return await AuditEvent.create({
      type,
      actorUserId,
      payload,
    });
  } catch (error) {
    // No bloquear operaciones de negocio si Mongo auditoría falla.
    console.warn(`Audit event skipped (${type}): ${error.message}`);
    return null;
  }
}

module.exports = { createAuditEvent };
