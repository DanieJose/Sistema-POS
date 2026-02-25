const { body, param } = require('express-validator');

const issueInvoiceValidations = [
  body('sale_id').isInt({ min: 1 }).withMessage('sale_id is required'),
  body('customer_name').optional({ nullable: true }).isString(),
  body('customer_rtn').optional({ nullable: true }).isString(),
  body('customer_address').optional({ nullable: true }).isString(),
];

const bySaleParamValidation = [param('saleId').isInt({ min: 1 })];
const invoiceIdParamValidation = [param('id').isInt({ min: 1 })];

const createCreditNoteValidations = [
  body('invoice_id').isInt({ min: 1 }).withMessage('invoice_id is required'),
  body('reason').trim().notEmpty().withMessage('reason is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('amount must be > 0'),
];

module.exports = {
  issueInvoiceValidations,
  bySaleParamValidation,
  invoiceIdParamValidation,
  createCreditNoteValidations,
};
