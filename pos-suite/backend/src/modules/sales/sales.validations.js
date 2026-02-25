const { body, param, query } = require('express-validator');

const createSaleValidations = [
  body('customer_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('issue_invoice').optional().isBoolean(),
  body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
  body('items.*.variant_id').isInt({ min: 1 }).withMessage('items[].variant_id is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('items[].quantity must be >= 1'),
  body('items.*.line_discount_amount').optional().isFloat({ min: 0 }),
  body('sale_discount_total').optional().isFloat({ min: 0 }),
  body('payments').isArray({ min: 1 }).withMessage('payments must be a non-empty array'),
  body('payments.*.method').isIn(['cash', 'card', 'transfer', 'points']),
  body('payments.*.amount_lempiras').optional().isFloat({ min: 0 }),
  body('payments.*.points_used').optional().isFloat({ min: 0 }),
  body('payments.*.reference').optional({ nullable: true }).isString(),
];

const listSalesValidations = [
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  query('status').optional().isIn(['COMPLETED', 'VOIDED', 'REFUNDED']),
];

const saleIdParamValidation = [param('id').isInt({ min: 1 })];

module.exports = { createSaleValidations, listSalesValidations, saleIdParamValidation };
