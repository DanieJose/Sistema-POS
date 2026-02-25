const { body, param, query } = require('express-validator');

const customerIdParamValidation = [param('id').isInt({ min: 1 }).withMessage('id must be integer')];

const listLoyaltyTransactionsValidations = [
  ...customerIdParamValidation,
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

const walletByCustomerValidations = [...customerIdParamValidation];

const topupValidations = [
  ...customerIdParamValidation,
  body('amount_lempiras').isFloat({ min: 0.01 }).withMessage('amount_lempiras must be > 0'),
  body('payment_method').isIn(['cash', 'card', 'transfer']).withMessage('payment_method invalid'),
  body('reference').optional({ nullable: true }).isString(),
];

const adjustPointsValidations = [
  ...customerIdParamValidation,
  body('points_delta').isFloat().withMessage('points_delta must be numeric'),
  body('reason').trim().notEmpty().withMessage('reason is required'),
];

const redeemQuoteValidations = [
  body('customer_id').isInt({ min: 1 }).withMessage('customer_id is required'),
  body('sale_total_lempiras').isFloat({ min: 0.01 }).withMessage('sale_total_lempiras must be > 0'),
  body('points_to_use').isFloat({ min: 0.01 }).withMessage('points_to_use must be > 0'),
];

const redeemCommitValidations = [
  body('customer_id').isInt({ min: 1 }).withMessage('customer_id is required'),
  body('points_to_use').isFloat({ min: 0.01 }).withMessage('points_to_use must be > 0'),
  body('related_sale_id').optional({ nullable: true }).isInt({ min: 1 }),
];

module.exports = {
  walletByCustomerValidations,
  listLoyaltyTransactionsValidations,
  topupValidations,
  adjustPointsValidations,
  redeemQuoteValidations,
  redeemCommitValidations,
};
