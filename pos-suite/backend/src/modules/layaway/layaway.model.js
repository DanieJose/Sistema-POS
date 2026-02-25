const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const Layaway = sequelize.define(
  'Layaway',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    down_payment_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    remaining_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    created_by_user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
  },
  {
    tableName: 'layaways',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = { Layaway };
