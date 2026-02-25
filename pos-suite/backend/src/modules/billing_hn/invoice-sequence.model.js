const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const InvoiceSequence = sequelize.define(
  'InvoiceSequence',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    current_int: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: 'invoice_sequences',
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at',
  }
);

module.exports = { InvoiceSequence };
