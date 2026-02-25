const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const Sale = sequelize.define(
  'Sale',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    sale_number: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    customer_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, references: { model: 'customers', key: 'id' } },
    cash_session_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'cash_sessions', key: 'id' },
    },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    discount_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    surcharge_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    tax_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    cost_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    profit_gross: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    status: {
      type: DataTypes.ENUM('COMPLETED', 'VOIDED', 'REFUNDED'),
      allowNull: false,
      defaultValue: 'COMPLETED',
    },
    created_by_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  },
  {
    tableName: 'sales',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

module.exports = { Sale };
