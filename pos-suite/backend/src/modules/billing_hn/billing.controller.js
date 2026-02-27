const path = require('path');

const billingService = require('./billing.service');
const { serializeCreditNote, serializeInvoice } = require('./billing.serializers');

function handleBillingError(error, res) {
  const badRequest = [
    'CAI_CONFIG_MISSING',
    'CAI_EXPIRED',
    'INVOICE_ALREADY_EXISTS',
    'CAI_RANGE_INVALID',
    'RANGE_EXCEEDED',
    'SALE_NOT_INVOICEABLE',
    'CREDIT_AMOUNT_INVALID',
  ];
  if (badRequest.includes(error.code)) {
    res.status(400).json({ ok: false, code: error.code, message: error.message });
    return true;
  }
  if (['SALE_NOT_FOUND', 'INVOICE_NOT_FOUND'].includes(error.code)) {
    res.status(404).json({ ok: false, code: error.code, message: error.message });
    return true;
  }
  return false;
}

async function issueInvoice(req, res) {
  try {
    const result = await billingService.issueInvoiceForSale(req.body, req.user.id);
    return res.status(201).json({
      ok: true,
      invoice: serializeInvoice(result.invoice),
      pdf_url: result.pdf_url,
    });
  } catch (error) {
    if (handleBillingError(error, res)) return;
    throw error;
  }
}

async function getInvoiceBySale(req, res) {
  const invoice = await billingService.getInvoiceBySaleId(req.params.saleId);
  if (!invoice) return res.status(404).json({ ok: false, message: 'Invoice not found for sale' });
  return res.json({ ok: true, data: serializeInvoice(invoice) });
}

async function downloadInvoicePdf(req, res) {
  const invoice = await billingService.getInvoiceById(req.params.id);
  if (!invoice) return res.status(404).json({ ok: false, message: 'Invoice not found' });
  if (!invoice.pdf_path) return res.status(404).json({ ok: false, message: 'Invoice PDF not generated' });

  const absPath = path.join(__dirname, '../../../', invoice.pdf_path.replace(/^\//, '').replace(/\//g, path.sep));
  return res.sendFile(absPath, (err) => {
    if (err && !res.headersSent) {
      res.status(err.statusCode || 500).json({ ok: false, message: 'Failed to read PDF' });
    }
  });
}

async function createCreditNote(req, res) {
  try {
    const creditNote = await billingService.createCreditNote(req.body, req.user.id);
    return res.status(201).json({ ok: true, data: serializeCreditNote(creditNote) });
  } catch (error) {
    if (handleBillingError(error, res)) return;
    throw error;
  }
}

module.exports = {
  issueInvoice,
  getInvoiceBySale,
  downloadInvoicePdf,
  createCreditNote,
};
