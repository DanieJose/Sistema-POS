const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const Goal = sequelize.define(
  'Goal',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    type: { type: DataTypes.ENUM('DAILY', 'WEEKLY', 'MONTHLY'), allowNull: false },
    target_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: false },
  },
  {
    tableName: 'goals',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

module.exports = { Goal };
