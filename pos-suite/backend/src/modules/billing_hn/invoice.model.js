const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const Invoice = sequelize.define(
  'Invoice',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    sale_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true,
      references: { model: 'sales', key: 'id' },
    },
    invoice_number: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    cai: { type: DataTypes.STRING(120), allowNull: false },
    range_from: { type: DataTypes.STRING(40), allowNull: false },
    range_to: { type: DataTypes.STRING(40), allowNull: false },
    cai_expires_at: { type: DataTypes.DATE, allowNull: false },
    issued_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    customer_name: { type: DataTypes.STRING(200), allowNull: false },
    customer_rtn: { type: DataTypes.STRING(50), allowNull: true },
    customer_address: { type: DataTypes.STRING(255), allowNull: true },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    discount_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    surcharge_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    tax_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { type: DataTypes.ENUM('ISSUED', 'VOIDED'), allowNull: false, defaultValue: 'ISSUED' },
    pdf_path: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    tableName: 'invoices',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = { Invoice };
