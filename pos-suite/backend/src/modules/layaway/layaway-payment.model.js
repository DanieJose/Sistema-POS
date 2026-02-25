const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const LayawayPayment = sequelize.define(
  'LayawayPayment',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    layaway_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'layaways',
        key: 'id',
      },
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    method: {
      type: DataTypes.ENUM('cash', 'card', 'transfer'),
      allowNull: false,
    },
    reference: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    created_by_user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
  },
  {
    tableName: 'layaway_payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

module.exports = { LayawayPayment };
