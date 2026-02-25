const { ProductVariant } = require('../products/models');
const { Layaway } = require('./layaway.model');
const { LayawayItem } = require('./layaway-item.model');
const { LayawayPayment } = require('./layaway-payment.model');

if (!Layaway.associations.items) {
  Layaway.hasMany(LayawayItem, {
    foreignKey: 'layaway_id',
    as: 'items',
    onDelete: 'CASCADE',
  });
}

if (!LayawayItem.associations.layaway) {
  LayawayItem.belongsTo(Layaway, {
    foreignKey: 'layaway_id',
    as: 'layaway',
  });
}

if (!Layaway.associations.payments) {
  Layaway.hasMany(LayawayPayment, {
    foreignKey: 'layaway_id',
    as: 'payments',
    onDelete: 'CASCADE',
  });
}

if (!LayawayPayment.associations.layaway) {
  LayawayPayment.belongsTo(Layaway, {
    foreignKey: 'layaway_id',
    as: 'layaway',
  });
}

if (!LayawayItem.associations.variant) {
  LayawayItem.belongsTo(ProductVariant, {
    foreignKey: 'product_variant_id',
    as: 'variant',
  });
}

module.exports = { Layaway, LayawayItem, LayawayPayment };
