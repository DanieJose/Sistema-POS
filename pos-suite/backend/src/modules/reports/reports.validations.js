const { query } = require('express-validator');

const dateRangeValidations = [
  query('date_from').optional().isISO8601().withMessage('date_from must be ISO date'),
  query('date_to').optional().isISO8601().withMessage('date_to must be ISO date'),
];

module.exports = { dateRangeValidations };
