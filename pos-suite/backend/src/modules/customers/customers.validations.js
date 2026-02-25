const { body, param, query } = require('express-validator');

const customerIdParamValidation = [param('id').isInt({ min: 1 }).withMessage('id must be integer')];

const createCustomerValidations = [
  body('full_name').trim().notEmpty().withMessage('full_name is required'),
  body('phone').trim().notEmpty().withMessage('phone is required'),
  body('email').optional({ nullable: true }).isEmail().withMessage('email must be valid'),
  body('is_active').optional().isBoolean(),
];

const listCustomersValidations = [query('phone').optional().isString(), query('name').optional().isString()];

const updateCustomerValidations = [
  ...customerIdParamValidation,
  body('full_name').optional().trim().notEmpty().withMessage('full_name cannot be empty'),
  body('phone').optional().trim().notEmpty().withMessage('phone cannot be empty'),
  body('email').optional({ nullable: true }).isEmail().withMessage('email must be valid'),
  body('is_active').optional().isBoolean(),
];

module.exports = {
  customerIdParamValidation,
  createCustomerValidations,
  listCustomersValidations,
  updateCustomerValidations,
};
