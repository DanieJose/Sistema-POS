const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const CashMovement = sequelize.define(
  'CashMovement',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    cash_session_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'cash_sessions', key: 'id' },
    },
    type: { type: DataTypes.ENUM('IN', 'OUT'), allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    reason: { type: DataTypes.STRING(255), allowNull: false },
    created_by_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  },
  {
    tableName: 'cash_movements',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

module.exports = { CashMovement };
