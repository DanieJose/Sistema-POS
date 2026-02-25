const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const LoyaltyWallet = sequelize.define(
  'LoyaltyWallet',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true,
      references: {
        model: 'customers',
        key: 'id',
      },
    },
    balance_points: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: 'loyalty_wallets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = { LoyaltyWallet };
