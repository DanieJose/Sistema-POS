const { Customer } = require('../loyalty/models');
const { Sale } = require('../sales/models');
const { CreditNote } = require('./credit-note.model');
const { Invoice } = require('./invoice.model');
const { InvoiceSequence } = require('./invoice-sequence.model');

if (!Sale.associations.invoice) {
  Sale.hasOne(Invoice, { foreignKey: 'sale_id', as: 'invoice' });
}
if (!Invoice.associations.sale) {
  Invoice.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });
}
if (!Invoice.associations.creditNotes) {
  Invoice.hasMany(CreditNote, { foreignKey: 'invoice_id', as: 'credit_notes' });
}
if (!CreditNote.associations.invoice) {
  CreditNote.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
}
if (!Sale.associations.customerBilling) {
  Sale.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer_billing' });
}
module.exports = { Invoice, CreditNote, InvoiceSequence };
