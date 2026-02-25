function serializeCashMovement(row) {
  const m = row.toJSON ? row.toJSON() : row;
  return {
    id: m.id,
    cash_session_id: m.cash_session_id,
    type: m.type,
    amount: m.amount,
    reason: m.reason,
    created_by_user_id: m.created_by_user_id,
    created_at: m.created_at,
  };
}

function serializeCashSession(row) {
  const s = row.toJSON ? row.toJSON() : row;
  return {
    id: s.id,
    opened_by_user_id: s.opened_by_user_id,
    opened_at: s.opened_at,
    opening_cash_amount: s.opening_cash_amount,
    closed_by_user_id: s.closed_by_user_id,
    closed_at: s.closed_at,
    closing_cash_counted: s.closing_cash_counted,
    status: s.status,
    notes: s.notes,
    movements: Array.isArray(s.movements) ? s.movements.map(serializeCashMovement) : undefined,
  };
}

module.exports = { serializeCashSession, serializeCashMovement };
