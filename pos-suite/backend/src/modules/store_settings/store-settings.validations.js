const { body } = require('express-validator');

const decimalFields = [
  'isv_rate',
  'card_surcharge_rate',
  'layaway_min_down_payment_amount',
  'layaway_min_down_payment_percent',
  'loyalty_point_value',
  'loyalty_earn_rate_lempiras',
  'loyalty_max_points_percent_per_sale',
  'loyalty_min_redeem_amount',
  'loyalty_topup_min',
  'loyalty_topup_max',
];

const booleanFields = [
  'prices_include_isv',
  'loyalty_allow_pay_with_points',
  'loyalty_allow_mixed_payment',
  'loyalty_topup_earns_points',
  'multi_branch_enabled',
];

const integerFields = ['layaway_days_max', 'loyalty_earn_rate_points', 'low_stock_threshold'];

const stringFields = [
  'trade_name',
  'legal_name',
  'rtn',
  'address',
  'phone',
  'logo_url',
  'cai',
  'range_from',
  'range_to',
  'establishment_code',
  'ticket_legend',
  'currency',
];

const updateStoreSettingsValidations = [
  body('email').optional({ nullable: true }).isEmail().withMessage('email must be valid'),
  body('cai_expires_at')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('cai_expires_at must be a valid ISO date'),
  body('currency')
    .optional({ nullable: true })
    .isString()
    .isLength({ min: 3, max: 10 })
    .withMessage('currency must be a valid code'),
  ...decimalFields.map((field) =>
    body(field).optional({ nullable: true }).isDecimal().withMessage(`${field} must be decimal`)
  ),
  ...booleanFields.map((field) =>
    body(field).optional().isBoolean().withMessage(`${field} must be boolean`)
  ),
  ...integerFields.map((field) =>
    body(field).optional().isInt({ min: 0 }).withMessage(`${field} must be integer`)
  ),
  ...stringFields.map((field) =>
    body(field).optional({ nullable: true }).isString().withMessage(`${field} must be string`)
  ),
  body('loyalty_topup_allowed_methods')
    .optional({ nullable: true })
    .custom((value) => {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
        throw new Error('loyalty_topup_allowed_methods must be a JSON array of strings');
      }
      return true;
    }),
  body('store_hours')
    .optional({ nullable: true })
    .custom((value) => {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new Error('store_hours must be a JSON object');
      }
      return true;
    }),
];

module.exports = { updateStoreSettingsValidations };
