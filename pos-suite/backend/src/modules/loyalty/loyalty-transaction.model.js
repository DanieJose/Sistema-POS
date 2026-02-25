const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const LoyaltyTransaction = sequelize.define(
  'LoyaltyTransaction',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'customers',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.ENUM('EARN', 'REDEEM', 'TOPUP', 'ADJUST'),
      allowNull: false,
    },
    points: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    amount_lempiras: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    payment_method: {
      type: DataTypes.ENUM('cash', 'card', 'transfer', 'none'),
      allowNull: false,
      defaultValue: 'none',
    },
    reference: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    related_sale_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    related_layaway_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    created_by_user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: 'loyalty_transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

module.exports = { LoyaltyTransaction };
