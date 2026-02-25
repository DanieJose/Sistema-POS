const { Product } = require('./product.model');
const { ProductVariant } = require('./product-variant.model');
const { ProductImage } = require('./product-image.model');

if (!Product.associations.variants) {
  Product.hasMany(ProductVariant, {
    foreignKey: 'product_id',
    as: 'variants',
    onDelete: 'CASCADE',
  });
}

if (!ProductVariant.associations.product) {
  ProductVariant.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product',
  });
}

if (!Product.associations.images) {
  Product.hasMany(ProductImage, {
    foreignKey: 'product_id',
    as: 'images',
    onDelete: 'CASCADE',
  });
}

if (!ProductImage.associations.product) {
  ProductImage.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product',
  });
}

module.exports = { Product, ProductVariant, ProductImage };
