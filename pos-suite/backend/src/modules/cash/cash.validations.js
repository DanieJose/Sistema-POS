const { body } = require('express-validator');

const openCashValidations = [
  body('opening_amount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('opening_amount must be >= 0'),
  body('opening_cash_amount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('opening_cash_amount must be >= 0'),
  body().custom((value) => {
    if (value?.opening_amount == null && value?.opening_cash_amount == null) {
      throw new Error('opening_amount is required');
    }
    return true;
  }),
];

const cashMovementValidations = [
  body('type').isIn(['IN', 'OUT']).withMessage('type must be IN or OUT'),
  body('amount').isFloat({ min: 0.01 }).withMessage('amount must be > 0'),
  body('reason').trim().notEmpty().withMessage('reason is required'),
];

const closeCashValidations = [
  body('counted_cash')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('counted_cash must be >= 0'),
  body('closing_cash_counted')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('closing_cash_counted must be >= 0'),
  body('notes').optional({ nullable: true }).isString(),
  body().custom((value) => {
    if (value?.counted_cash == null && value?.closing_cash_counted == null) {
      throw new Error('counted_cash is required');
    }
    return true;
  }),
];

module.exports = { openCashValidations, cashMovementValidations, closeCashValidations };
