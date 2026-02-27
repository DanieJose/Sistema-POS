const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const StoreSettings = sequelize.define(
  'StoreSettings',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    trade_name: { type: DataTypes.STRING(150), allowNull: true, field: 'nombre_comercial' },
    legal_name: { type: DataTypes.STRING(200), allowNull: true, field: 'razon_social' },
    rtn: { type: DataTypes.STRING(50), allowNull: true },
    address: { type: DataTypes.STRING(255), allowNull: true, field: 'direccion' },
    phone: { type: DataTypes.STRING(50), allowNull: true, field: 'telefono' },
    email: { type: DataTypes.STRING(255), allowNull: true, validate: { isEmail: true }, field: 'correo' },
    logo_url: { type: DataTypes.STRING(500), allowNull: true },
    cai: { type: DataTypes.STRING(100), allowNull: true },
    range_from: { type: DataTypes.STRING(50), allowNull: true, field: 'rango_desde' },
    range_to: { type: DataTypes.STRING(50), allowNull: true, field: 'rango_hasta' },
    cai_expires_at: { type: DataTypes.DATE, allowNull: true, field: 'fecha_vencimiento_cai' },
    establishment_code: { type: DataTypes.STRING(50), allowNull: true, field: 'establecimiento' },
    point_emission: { type: DataTypes.STRING(50), allowNull: true, field: 'punto_emision' },
    correlativo_actual: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    ticket_legend: { type: DataTypes.TEXT, allowNull: true, field: 'legal_text' },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'HNL', field: 'moneda' },
    isv_rate: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 15.0 },
    prices_include_isv: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    card_surcharge_rate: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
    discount_limit_cashier: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    discount_limit_supervisor: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 20 },
    discount_limit_admin: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 100 },
    layaway_days_max: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 8 },
    layaway_min_down_payment_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    layaway_min_down_payment_percent: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    loyalty_point_value: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 1.0 },
    loyalty_earn_rate_points: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    loyalty_earn_rate_lempiras: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 10,
    },
    loyalty_allow_pay_with_points: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    loyalty_allow_mixed_payment: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    loyalty_max_points_percent_per_sale: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 80,
    },
    loyalty_min_redeem_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 10,
    },
    loyalty_topup_min: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 50 },
    loyalty_topup_max: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 5000 },
    loyalty_topup_allowed_methods: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '["cash","card","transfer"]',
    },
    loyalty_topup_earns_points: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    store_hours: { type: DataTypes.TEXT, allowNull: true, defaultValue: '{}' },
    low_stock_threshold: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 5 },
    multi_branch_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: 'store_settings',
    timestamps: false,
  }
);

module.exports = { StoreSettings };
