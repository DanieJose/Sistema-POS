const { body, query } = require('express-validator');

const createGoalValidations = [
  body('type').isIn(['DAILY', 'WEEKLY', 'MONTHLY']).withMessage('type invalid'),
  body('target_amount').isFloat({ min: 0.01 }).withMessage('target_amount must be > 0'),
  body('start_date').isISO8601().withMessage('start_date invalid'),
  body('end_date').isISO8601().withMessage('end_date invalid'),
];

const goalProgressValidations = [query('goal_id').isInt({ min: 1 }).withMessage('goal_id is required')];

module.exports = { createGoalValidations, goalProgressValidations };
