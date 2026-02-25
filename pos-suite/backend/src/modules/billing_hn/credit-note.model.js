const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const CreditNote = sequelize.define(
  'CreditNote',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    invoice_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'invoices', key: 'id' },
    },
    credit_number: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    reason: { type: DataTypes.STRING(255), allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    issued_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    status: { type: DataTypes.ENUM('ISSUED', 'VOIDED'), allowNull: false, defaultValue: 'ISSUED' },
    created_by_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  },
  {
    tableName: 'credit_notes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

module.exports = { CreditNote };
