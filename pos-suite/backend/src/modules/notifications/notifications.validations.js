const { param, query } = require('express-validator');

const listNotificationsValidations = [
  query('read').optional().isBoolean(),
  query('type').optional().isString(),
  query('severity').optional().isIn(['info', 'warning', 'critical']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

const notificationIdParamValidation = [param('id').isMongoId().withMessage('invalid notification id')];

module.exports = { listNotificationsValidations, notificationIdParamValidation };
