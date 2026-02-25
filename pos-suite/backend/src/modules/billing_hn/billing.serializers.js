function serializeInvoice(row) {
  const i = row.toJSON ? row.toJSON() : row;
  return {
    id: i.id,
    sale_id: i.sale_id,
    invoice_number: i.invoice_number,
    cai: i.cai,
    range_from: i.range_from,
    range_to: i.range_to,
    cai_expires_at: i.cai_expires_at,
    issued_at: i.issued_at,
    customer_name: i.customer_name,
    customer_rtn: i.customer_rtn,
    customer_address: i.customer_address,
    subtotal: i.subtotal,
    discount_total: i.discount_total,
    surcharge_total: i.surcharge_total,
    tax_total: i.tax_total,
    total: i.total,
    status: i.status,
    pdf_path: i.pdf_path,
    created_at: i.created_at,
    updated_at: i.updated_at,
  };
}

function serializeCreditNote(row) {
  const c = row.toJSON ? row.toJSON() : row;
  return {
    id: c.id,
    invoice_id: c.invoice_id,
    credit_number: c.credit_number,
    reason: c.reason,
    amount: c.amount,
    issued_at: c.issued_at,
    status: c.status,
    created_by_user_id: c.created_by_user_id,
    created_at: c.created_at,
  };
}

module.exports = { serializeInvoice, serializeCreditNote };
