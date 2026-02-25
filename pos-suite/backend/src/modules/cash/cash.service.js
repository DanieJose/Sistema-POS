const { createAuditEvent } = require('../audit/audit.service');
const { CashMovement, CashSession } = require('./models');

async function getOpenCashSession(options = {}) {
  return CashSession.findOne({
    where: { status: 'OPEN' },
    include: [{ model: CashMovement, as: 'movements' }],
    order: [['id', 'DESC']],
    ...options,
  });
}

async function openCashSession({ opening_cash_amount }, actorUserId) {
  const existing = await CashSession.findOne({ where: { status: 'OPEN' } });
  if (existing) {
    const error = new Error('There is already an OPEN cash session');
    error.code = 'CASH_ALREADY_OPEN';
    throw error;
  }

  const session = await CashSession.create({
    opened_by_user_id: actorUserId,
    opened_at: new Date(),
    opening_cash_amount,
    status: 'OPEN',
  });

  await createAuditEvent({
    type: 'CASH_OPEN',
    actorUserId,
    payload: { cashSessionId: session.id, opening_cash_amount },
  });

  return getOpenCashSession({ where: { id: session.id } });
}

async function createCashMovement(payload, actorUserId) {
  const session = await CashSession.findOne({ where: { status: 'OPEN' } });
  if (!session) {
    const error = new Error('No OPEN cash session');
    error.code = 'CASH_NOT_OPEN';
    throw error;
  }

  const movement = await CashMovement.create({
    cash_session_id: session.id,
    type: payload.type,
    amount: payload.amount,
    reason: payload.reason,
    created_by_user_id: actorUserId,
  });

  await createAuditEvent({
    type: 'CASH_MOVEMENT',
    actorUserId,
    payload: {
      cashSessionId: session.id,
      movementId: movement.id,
      type: movement.type,
      amount: movement.amount,
      reason: movement.reason,
    },
  });

  return movement;
}

async function closeCashSession(payload, actorUserId) {
  const session = await CashSession.findOne({ where: { status: 'OPEN' } });
  if (!session) {
    const error = new Error('No OPEN cash session');
    error.code = 'CASH_NOT_OPEN';
    throw error;
  }

  session.closed_by_user_id = actorUserId;
  session.closed_at = new Date();
  session.closing_cash_counted = payload.closing_cash_counted;
  session.status = 'CLOSED';
  session.notes = payload.notes ?? null;
  await session.save();

  await createAuditEvent({
    type: 'CASH_CLOSE',
    actorUserId,
    payload: {
      cashSessionId: session.id,
      closing_cash_counted: payload.closing_cash_counted,
      notes: payload.notes ?? null,
    },
  });

  return session;
}

module.exports = {
  getOpenCashSession,
  openCashSession,
  createCashMovement,
  closeCashSession,
};
