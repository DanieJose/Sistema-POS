const { createAuditEvent } = require('../audit/audit.service');
const { CashMovement, CashSession } = require('./models');

function toMoney(value) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
}

function normalizeOpeningAmount(payload = {}) {
  return toMoney(payload.opening_amount ?? payload.opening_cash_amount);
}

function normalizeCountedCash(payload = {}) {
  return toMoney(payload.counted_cash ?? payload.closing_cash_counted);
}

async function getOpenCashSession(options = {}) {
  return CashSession.findOne({
    where: { status: 'OPEN' },
    include: [{ model: CashMovement, as: 'movements' }],
    order: [['id', 'DESC']],
    ...options,
  });
}

async function openCashSession(payload, actorUserId) {
  const existing = await CashSession.findOne({ where: { status: 'OPEN' } });
  if (existing) {
    const error = new Error('There is already an OPEN cash session');
    error.code = 'CASH_ALREADY_OPEN';
    throw error;
  }

  const openingCashAmount = normalizeOpeningAmount(payload);

  const session = await CashSession.create({
    opened_by_user_id: actorUserId,
    opened_at: new Date(),
    opening_cash_amount: openingCashAmount,
    status: 'OPEN',
  });

  await createAuditEvent({
    type: 'cash_open',
    actorUserId,
    payload: { cashSessionId: session.id, opening_amount: openingCashAmount, timestamp: new Date() },
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
    amount: toMoney(payload.amount),
    reason: payload.reason,
    created_by_user_id: actorUserId,
  });

  await createAuditEvent({
    type: 'cash_movement',
    actorUserId,
    payload: {
      cashSessionId: session.id,
      movementId: movement.id,
      type: movement.type,
      amount: movement.amount,
      reason: movement.reason,
      timestamp: new Date(),
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

  const movements = await CashMovement.findAll({ where: { cash_session_id: session.id } });
  const countedCash = normalizeCountedCash(payload);
  const openingCash = toMoney(session.opening_cash_amount);

  const totals = movements.reduce(
    (acc, movement) => {
      const amount = toMoney(movement.amount);
      if (movement.type === 'IN') acc.totalIn += amount;
      if (movement.type === 'OUT') acc.totalOut += amount;
      return acc;
    },
    { totalIn: 0, totalOut: 0 }
  );

  const expectedCash = toMoney(openingCash + totals.totalIn - totals.totalOut);
  const difference = toMoney(countedCash - expectedCash);

  session.closed_by_user_id = actorUserId;
  session.closed_at = new Date();
  session.closing_cash_counted = countedCash;
  session.status = 'CLOSED';
  session.notes = payload.notes ?? null;
  await session.save();

  await createAuditEvent({
    type: 'cash_close',
    actorUserId,
    payload: {
      cashSessionId: session.id,
      counted_cash: countedCash,
      expected_cash: expectedCash,
      difference,
      notes: payload.notes ?? null,
      timestamp: new Date(),
    },
  });

  return {
    ...(session.toJSON ? session.toJSON() : session),
    summary: {
      opening_amount: openingCash,
      total_in: toMoney(totals.totalIn),
      total_out: toMoney(totals.totalOut),
      expected_cash: expectedCash,
      counted_cash: countedCash,
      difference,
    },
  };
}

module.exports = {
  getOpenCashSession,
  openCashSession,
  createCashMovement,
  closeCashSession,
};
