const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const LayawayItem = sequelize.define(
  'LayawayItem',
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
    product_variant_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'product_variants',
        key: 'id',
      },
    },
    quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    tableName: 'layaway_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

module.exports = { LayawayItem };
