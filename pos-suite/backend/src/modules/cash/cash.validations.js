const { body } = require('express-validator');

const openCashValidations = [
  body('opening_cash_amount')
    .isFloat({ min: 0 })
    .withMessage('opening_cash_amount must be >= 0'),
];

const cashMovementValidations = [
  body('type').isIn(['IN', 'OUT']).withMessage('type must be IN or OUT'),
  body('amount').isFloat({ min: 0.01 }).withMessage('amount must be > 0'),
  body('reason').trim().notEmpty().withMessage('reason is required'),
];

const closeCashValidations = [
  body('closing_cash_counted')
    .isFloat({ min: 0 })
    .withMessage('closing_cash_counted must be >= 0'),
  body('notes').optional({ nullable: true }).isString(),
];

module.exports = { openCashValidations, cashMovementValidations, closeCashValidations };
