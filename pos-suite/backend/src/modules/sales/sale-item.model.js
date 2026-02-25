const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const SaleItem = sequelize.define(
  'SaleItem',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    sale_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'sales', key: 'id' } },
    product_variant_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'product_variants', key: 'id' },
    },
    quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    unit_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    line_subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    line_discount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  },
  {
    tableName: 'sale_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

module.exports = { SaleItem };
