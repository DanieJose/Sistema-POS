const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const CashSession = sequelize.define(
  'CashSession',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    opened_by_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    opened_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    opening_cash_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    closed_by_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    closed_at: { type: DataTypes.DATE, allowNull: true },
    closing_cash_counted: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    status: { type: DataTypes.ENUM('OPEN', 'CLOSED'), allowNull: false, defaultValue: 'OPEN' },
    notes: { type: DataTypes.STRING(255), allowNull: true },
  },
  { tableName: 'cash_sessions', timestamps: false }
);

module.exports = { CashSession };
