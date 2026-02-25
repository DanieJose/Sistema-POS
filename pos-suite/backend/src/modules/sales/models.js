const { Customer } = require('../loyalty/models');
const { ProductVariant } = require('../products/models');
const { CashSession } = require('../cash/models');
const { SaleItem } = require('./sale-item.model');
const { SalePayment } = require('./sale-payment.model');
const { Sale } = require('./sale.model');

if (!Sale.associations.items) {
  Sale.hasMany(SaleItem, { foreignKey: 'sale_id', as: 'items', onDelete: 'CASCADE' });
}
if (!Sale.associations.payments) {
  Sale.hasMany(SalePayment, { foreignKey: 'sale_id', as: 'payments', onDelete: 'CASCADE' });
}
if (!SaleItem.associations.sale) {
  SaleItem.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });
}
if (!SalePayment.associations.sale) {
  SalePayment.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });
}
if (!SaleItem.associations.variant) {
  SaleItem.belongsTo(ProductVariant, { foreignKey: 'product_variant_id', as: 'variant' });
}
if (!Sale.associations.customer) {
  Sale.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
}
if (!Sale.associations.cashSession) {
  Sale.belongsTo(CashSession, { foreignKey: 'cash_session_id', as: 'cash_session' });
}

module.exports = { Sale, SaleItem, SalePayment };
