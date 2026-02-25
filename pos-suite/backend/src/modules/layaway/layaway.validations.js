const { body, param, query } = require('express-validator');

const paymentMethods = ['cash', 'card', 'transfer'];

const createLayawayValidations = [
  body('customer_id')
    .isInt({ min: 1 })
    .withMessage('customer_id is required and must be a positive integer'),
  body('down_payment_amount')
    .isFloat({ min: 0 })
    .withMessage('down_payment_amount must be >= 0'),
  body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
  body('items.*.product_variant_id')
    .isInt({ min: 1 })
    .withMessage('items[].product_variant_id must be a positive integer'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('items[].quantity must be >= 1'),
  body('items.*.unit_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('items[].unit_price must be >= 0'),
  body('payment_method')
    .optional()
    .isIn(paymentMethods)
    .withMessage('payment_method must be one of cash, card, transfer'),
  body('payment_reference').optional({ nullable: true }).isString(),
];

const listLayawaysValidations = [
  query('status')
    .optional()
    .isIn(['ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED'])
    .withMessage('status filter is invalid'),
];

const layawayIdParamValidation = [param('id').isInt({ min: 1 }).withMessage('id must be integer')];

const createPaymentValidations = [
  ...layawayIdParamValidation,
  body('amount').isFloat({ min: 0.01 }).withMessage('amount must be > 0'),
  body('method').isIn(paymentMethods).withMessage('method must be cash/card/transfer'),
  body('reference').optional({ nullable: true }).isString(),
];

const cancelLayawayValidations = [...layawayIdParamValidation];

module.exports = {
  createLayawayValidations,
  listLayawaysValidations,
  layawayIdParamValidation,
  createPaymentValidations,
  cancelLayawayValidations,
};
