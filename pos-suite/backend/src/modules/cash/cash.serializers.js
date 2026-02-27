function serializeCashMovement(row) {
  const m = row.toJSON ? row.toJSON() : row;
  return {
    id: m.id,
    cash_session_id: m.cash_session_id,
    type: m.type,
    amount: Number(m.amount),
    reason: m.reason,
    created_by: m.created_by_user_id,
    created_at: m.created_at,
  };
}

function serializeCashSession(row) {
  const s = row.toJSON ? row.toJSON() : row;
  return {
    id: s.id,
    opened_by: s.opened_by_user_id,
    opened_at: s.opened_at,
    opening_amount: Number(s.opening_cash_amount),
    opening_cash_amount: Number(s.opening_cash_amount),
    closed_by: s.closed_by_user_id,
    closed_at: s.closed_at,
    counted_cash: s.closing_cash_counted == null ? null : Number(s.closing_cash_counted),
    closing_cash_counted: s.closing_cash_counted == null ? null : Number(s.closing_cash_counted),
    status: s.status,
    notes: s.notes,
    summary: s.summary,
    movements: Array.isArray(s.movements) ? s.movements.map(serializeCashMovement) : undefined,
  };
}

module.exports = { serializeCashSession, serializeCashMovement };
