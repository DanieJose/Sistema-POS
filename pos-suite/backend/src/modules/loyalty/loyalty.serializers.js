function serializeLoyaltyTransaction(txInstance) {
  const tx = txInstance.toJSON ? txInstance.toJSON() : txInstance;
  return {
    id: tx.id,
    customer_id: tx.customer_id,
    type: tx.type,
    points: tx.points,
    amount_lempiras: tx.amount_lempiras,
    payment_method: tx.payment_method,
    reference: tx.reference,
    related_sale_id: tx.related_sale_id,
    related_layaway_id: tx.related_layaway_id,
    created_by_user_id: tx.created_by_user_id,
    reason: tx.reason,
    created_at: tx.created_at,
  };
}

module.exports = { serializeLoyaltyTransaction };
