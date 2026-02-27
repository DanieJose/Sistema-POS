const salesService = require('./sales.service');
const { serializeSale } = require('./sales.serializers');
const billingService = require('../billing_hn/billing.service');
const { serializeInvoice } = require('../billing_hn/billing.serializers');

function handleSalesError(error, res) {
  const badRequestCodes = [
    'CASH_NOT_OPEN',
    'INSUFFICIENT_STOCK',
    'DISCOUNT_INVALID',
    'DISCOUNT_LIMIT',
    'PAYMENT_REFERENCE_REQUIRED',
    'PAYMENT_TOTAL_MISMATCH',
    'POINTS_REQUIRE_CUSTOMER',
    'POINTS_DISABLED',
    'POINTS_MIN_REDEEM',
    'INSUFFICIENT_POINTS',
    'POINTS_MAX_PERCENT',
    'MIXED_DISABLED',
    'SALE_NOT_VOIDABLE',
    'LOYALTY_REVERSE_BLOCKED',
  ];
  if (badRequestCodes.includes(error.code)) {
    res.status(400).json({ ok: false, message: error.message, ...(error.meta || {}) });
    return true;
  }
  if (['VARIANT_NOT_FOUND', 'CUSTOMER_NOT_FOUND', 'SALE_NOT_FOUND'].includes(error.code)) {
    res.status(404).json({ ok: false, message: error.message });
    return true;
  }
  return false;
}

async function createSale(req, res) {
  try {
    const sale = await salesService.createSale(req.body, req.user);
    let invoice = null;
    if (req.body.issue_invoice === true) {
      const billingResult = await billingService.issueInvoiceForSale(
        {
          sale_id: sale.id,
        },
        req.user.id
      );
      invoice = {
        ...serializeInvoice(billingResult.invoice),
        pdf_url: billingResult.pdf_url,
      };
    }
    return res.status(201).json({ ok: true, data: serializeSale(sale), invoice });
  } catch (error) {
    if (handleSalesError(error, res)) return;
    if (
      [
        'CAI_CONFIG_MISSING',
        'CAI_EXPIRED',
        'INVOICE_ALREADY_EXISTS',
        'CAI_RANGE_INVALID',
        'RANGE_EXCEEDED',
        'SALE_NOT_INVOICEABLE',
      ].includes(error.code)
    ) {
      return res.status(400).json({ ok: false, code: error.code, message: error.message });
    }
    throw error;
  }
}

async function listSales(req, res) {
  const rows = await salesService.listSales(req.query);
  return res.json({ ok: true, data: rows.map(serializeSale) });
}

async function getSaleById(req, res) {
  const sale = await salesService.getSaleById(req.params.id);
  if (!sale) return res.status(404).json({ ok: false, message: 'Sale not found' });
  return res.json({ ok: true, data: serializeSale(sale) });
}

async function voidSale(req, res) {
  try {
    const sale = await salesService.voidSale(req.params.id, req.user);
    return res.json({ ok: true, data: serializeSale(sale) });
  } catch (error) {
    if (handleSalesError(error, res)) return;
    throw error;
  }
}

module.exports = { createSale, listSales, getSaleById, voidSale };
