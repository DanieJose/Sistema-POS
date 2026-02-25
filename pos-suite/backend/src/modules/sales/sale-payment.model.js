const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const SalePayment = sequelize.define(
  'SalePayment',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    sale_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'sales', key: 'id' } },
    method: { type: DataTypes.ENUM('cash', 'card', 'transfer', 'points'), allowNull: false },
    amount_lempiras: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    points_used: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    reference: { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    tableName: 'sale_payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

module.exports = { SalePayment };
