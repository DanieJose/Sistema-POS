const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const Role = sequelize.define(
  'Role',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      validate: {
        isIn: [['ADMIN', 'SUPERVISOR', 'CASHIER']],
      },
    },
  },
  {
    tableName: 'roles',
    underscored: true,
    timestamps: false,
  }
);

module.exports = { Role };
