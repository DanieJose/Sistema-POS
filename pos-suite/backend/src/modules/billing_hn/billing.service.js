const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');

const { sequelize } = require('../../config/mysql');
const { createAuditEvent } = require('../audit/audit.service');
const { Customer } = require('../loyalty/models');
const { ProductVariant, Product } = require('../products/models');
const {
  getOrCreateStoreSettings,
  validateSarOrThrow,
} = require('../store_settings/store-settings.service');
const { Sale, SaleItem, SalePayment } = require('../sales/models');
const { CreditNote, Invoice, InvoiceSequence } = require('./models');

const invoicesDir = path.join(__dirname, '../../../storage/invoices');
fs.mkdirSync(invoicesDir, { recursive: true });

function splitCorrelative(value) {
  const match = String(value || '').match(/^(.*?)(\d+)$/);
  if (!match) return null;
  return { prefix: match[1], numeric: Number(match[2]), width: match[2].length };
}

function formatCorrelative(prefix, width, numeric) {
  return `${prefix}${String(numeric).padStart(width, '0')}`;
}

function makeCreditNumber(invoiceNumber) {
  const safe = String(invoiceNumber).replace(/[^0-9A-Za-z-]/g, '');
  return `NC-${safe}-${Date.now()}`;
}

async function loadSaleForBilling(saleId, transaction) {
  return Sale.findByPk(saleId, {
    include: [
      {
        model: SaleItem,
        as: 'items',
        include: [{ model: ProductVariant, as: 'variant', include: [{ model: Product, as: 'product' }] }],
      },
      { model: SalePayment, as: 'payments' },
      { model: Customer, as: 'customer_billing' },
      { model: Invoice, as: 'invoice' },
    ],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
}

function resolveCustomerSnapshot(sale, payload) {
  const fromCustomer = sale.customer_billing;
  return {
    customer_name: payload.customer_name || fromCustomer?.full_name || 'Consumidor Final',
    customer_rtn: payload.customer_rtn ?? null,
    customer_address: payload.customer_address ?? null,
  };
}

function generatePdf(invoice, sale, settings) {
  return new Promise((resolve, reject) => {
    const filename = `${invoice.invoice_number.replace(/[^0-9A-Za-z-]/g, '_')}.pdf`;
    const fullPath = path.join(invoicesDir, filename);
    const publicPath = `/storage/invoices/${filename}`;

    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(fullPath);
    doc.pipe(stream);

    doc.fontSize(16).text(settings.trade_name || 'Tienda', { align: 'center' });
    doc.fontSize(10).text(settings.address || '', { align: 'center' });
    doc.text(`Tel: ${settings.phone || ''}`, { align: 'center' });
    doc.text(`RTN: ${settings.rtn || ''}`, { align: 'center' });
    doc.moveDown();
    doc.text(`Factura: ${invoice.invoice_number}`);
    doc.text(`CAI: ${invoice.cai}`);
    doc.text(`Rango: ${invoice.range_from} - ${invoice.range_to}`);
    doc.text(`Vence CAI: ${new Date(invoice.cai_expires_at).toISOString()}`);
    doc.text(`Fecha emisión: ${new Date(invoice.issued_at).toISOString()}`);
    doc.moveDown();
    doc.text(`Cliente: ${invoice.customer_name}`);
    if (invoice.customer_rtn) doc.text(`RTN Cliente: ${invoice.customer_rtn}`);
    if (invoice.customer_address) doc.text(`Dirección: ${invoice.customer_address}`);
    doc.moveDown();

    doc.text('Detalle:');
    sale.items.forEach((item) => {
      const name = item.variant?.product?.name || item.variant?.sku || `Variante ${item.product_variant_id}`;
      const lineTotal = Number(item.line_subtotal) - Number(item.line_discount || 0);
      doc.text(`${name} | Qty ${item.quantity} | P ${item.unit_price} | L ${lineTotal.toFixed(2)}`);
    });

    doc.moveDown();
    doc.text(`Subtotal: L ${Number(invoice.subtotal).toFixed(2)}`);
    doc.text(`Descuento: L ${Number(invoice.discount_total).toFixed(2)}`);
    doc.text(`Recargo: L ${Number(invoice.surcharge_total).toFixed(2)}`);
    doc.text(`ISV: L ${Number(invoice.tax_total).toFixed(2)}`);
    doc.fontSize(12).text(`TOTAL: L ${Number(invoice.total).toFixed(2)}`);
    doc.moveDown();
    if (settings.ticket_legend) doc.fontSize(10).text(String(settings.ticket_legend));

    doc.end();
    stream.on('finish', () => resolve({ fullPath, publicPath }));
    stream.on('error', reject);
    doc.on('error', reject);
  });
}

async function issueInvoiceForSale(payload, actorUserId) {
  let saleIdForAudit = payload.sale_id;
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const [settings, sale] = await Promise.all([
        getOrCreateStoreSettings(),
        loadSaleForBilling(payload.sale_id, transaction),
      ]);
      if (!sale) {
        const e = new Error('Sale not found');
        e.code = 'SALE_NOT_FOUND';
        throw e;
      }
      saleIdForAudit = sale.id;
      if (sale.status !== 'COMPLETED') {
        const e = new Error('Only COMPLETED sales can be invoiced');
        e.code = 'SALE_NOT_INVOICEABLE';
        throw e;
      }
      if (sale.invoice) {
        const e = new Error('Invoice already exists for this sale');
        e.code = 'INVOICE_ALREADY_EXISTS';
        throw e;
      }

      validateSarOrThrow(settings);
      const from = splitCorrelative(settings.range_from);
      const to = splitCorrelative(settings.range_to);
      if (!from || !to || from.prefix !== to.prefix || from.width !== to.width) {
        const e = new Error('Invalid CAI range format');
        e.code = 'CAI_RANGE_INVALID';
        throw e;
      }

      let seq = await InvoiceSequence.findByPk(1, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!seq) {
        seq = await InvoiceSequence.create({ id: 1, current_int: from.numeric - 1 }, { transaction });
      }

      const nextInt = Number(seq.current_int) + 1;
      if (nextInt > to.numeric) {
        const e = new Error('El correlativo está fuera del rango CAI');
        e.code = 'RANGE_EXCEEDED';
        throw e;
      }
      const invoiceNumber = formatCorrelative(from.prefix, from.width, nextInt);

      const customerSnapshot = resolveCustomerSnapshot(sale, payload);
      const invoice = await Invoice.create(
        {
          sale_id: sale.id,
          invoice_number: invoiceNumber,
          cai: settings.cai,
          range_from: settings.range_from,
          range_to: settings.range_to,
          cai_expires_at: settings.cai_expires_at,
          issued_at: new Date(),
          customer_name: customerSnapshot.customer_name,
          customer_rtn: customerSnapshot.customer_rtn,
          customer_address: customerSnapshot.customer_address,
          subtotal: sale.subtotal,
          discount_total: sale.discount_total,
          surcharge_total: sale.surcharge_total,
          tax_total: sale.tax_total,
          total: sale.total,
          status: 'ISSUED',
        },
        { transaction }
      );

      seq.current_int = nextInt;
      await seq.save({ transaction });

      return { invoice, sale, settings };
    });

    const pdf = await generatePdf(result.invoice, result.sale, result.settings);
    result.invoice.pdf_path = pdf.publicPath;
    await result.invoice.save();

    await createAuditEvent({
      type: 'INVOICE_ISSUE',
      actorUserId,
      payload: { invoiceId: result.invoice.id, saleId: result.sale.id, invoice_number: result.invoice.invoice_number },
    });

    return { invoice: await Invoice.findByPk(result.invoice.id), pdf_url: `/api/billing/invoices/${result.invoice.id}/pdf` };
  } catch (error) {
    await createAuditEvent({
      type: 'INVOICE_FAIL',
      actorUserId,
      payload: { saleId: saleIdForAudit || null, message: error.message, code: error.code || 'UNKNOWN' },
    });
    throw error;
  }
}

async function getInvoiceBySaleId(saleId) {
  return Invoice.findOne({ where: { sale_id: saleId } });
}

async function getInvoiceById(id) {
  return Invoice.findByPk(id);
}

async function createCreditNote(payload, actorUserId) {
  const invoice = await Invoice.findByPk(payload.invoice_id);
  if (!invoice) {
    const e = new Error('Invoice not found');
    e.code = 'INVOICE_NOT_FOUND';
    throw e;
  }
  if (Number(payload.amount) > Number(invoice.total)) {
    const e = new Error('Credit note amount cannot exceed invoice total');
    e.code = 'CREDIT_AMOUNT_INVALID';
    throw e;
  }

  const creditNote = await CreditNote.create({
    invoice_id: invoice.id,
    credit_number: makeCreditNumber(invoice.invoice_number),
    reason: payload.reason,
    amount: payload.amount,
    issued_at: new Date(),
    status: 'ISSUED',
    created_by_user_id: actorUserId,
  });

  await createAuditEvent({
    type: 'CREDIT_NOTE_CREATE',
    actorUserId,
    payload: { creditNoteId: creditNote.id, invoiceId: invoice.id, amount: payload.amount },
  });

  return creditNote;
}

module.exports = {
  issueInvoiceForSale,
  getInvoiceBySaleId,
  getInvoiceById,
  createCreditNote,
};
