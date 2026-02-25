function serializeSale(row) {
  const sale = row.toJSON ? row.toJSON() : row;
  return {
    id: sale.id,
    sale_number: sale.sale_number,
    customer_id: sale.customer_id,
    cash_session_id: sale.cash_session_id,
    subtotal: sale.subtotal,
    discount_total: sale.discount_total,
    surcharge_total: sale.surcharge_total,
    tax_total: sale.tax_total,
    total: sale.total,
    cost_total: sale.cost_total,
    profit_gross: sale.profit_gross,
    status: sale.status,
    created_by_user_id: sale.created_by_user_id,
    created_at: sale.created_at,
    items: Array.isArray(sale.items)
      ? sale.items.map((item) => ({
          id: item.id,
          sale_id: item.sale_id,
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_cost: item.unit_cost,
          line_subtotal: item.line_subtotal,
          line_discount: item.line_discount,
          created_at: item.created_at,
          variant: item.variant
            ? {
                id: item.variant.id,
                sku: item.variant.sku,
                product_id: item.variant.product_id,
              }
            : undefined,
        }))
      : undefined,
    payments: Array.isArray(sale.payments)
      ? sale.payments.map((p) => ({
          id: p.id,
          sale_id: p.sale_id,
          method: p.method,
          amount_lempiras: p.amount_lempiras,
          points_used: p.points_used,
          reference: p.reference,
          created_at: p.created_at,
        }))
      : undefined,
  };
}

module.exports = { serializeSale };
