function serializeLayaway(layawayInstance) {
  const layaway = layawayInstance.toJSON ? layawayInstance.toJSON() : layawayInstance;

  return {
    id: layaway.id,
    customer_id: layaway.customer_id,
    status: layaway.status,
    total_amount: layaway.total_amount,
    down_payment_amount: layaway.down_payment_amount,
    remaining_amount: layaway.remaining_amount,
    due_date: layaway.due_date,
    created_by_user_id: layaway.created_by_user_id,
    created_at: layaway.created_at,
    updated_at: layaway.updated_at,
    items: Array.isArray(layaway.items)
      ? layaway.items.map((item) => ({
          id: item.id,
          layaway_id: item.layaway_id,
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          created_at: item.created_at,
          variant: item.variant
            ? {
                id: item.variant.id,
                sku: item.variant.sku,
                product_id: item.variant.product_id,
                color: item.variant.color,
                size: item.variant.size,
                tone: item.variant.tone,
                model: item.variant.model,
              }
            : undefined,
        }))
      : undefined,
    payments: Array.isArray(layaway.payments)
      ? layaway.payments.map((payment) => ({
          id: payment.id,
          layaway_id: payment.layaway_id,
          amount: payment.amount,
          method: payment.method,
          reference: payment.reference,
          created_by_user_id: payment.created_by_user_id,
          created_at: payment.created_at,
        }))
      : undefined,
  };
}

module.exports = { serializeLayaway };
