const express = require('express');

const { authJwt } = require('../../middlewares/authJwt');
const { requireRole } = require('../../middlewares/requireRole');
const { validateRequest } = require('../../middlewares/validateRequest');
const notificationsController = require('./notifications.controller');
const {
  listNotificationsValidations,
  notificationIdParamValidation,
} = require('./notifications.validations');

const router = express.Router();

router.use(authJwt);

router.get(
  '/',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...listNotificationsValidations, validateRequest],
  notificationsController.listNotifications
);
router.get(
  '/summary',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  notificationsController.summary
);
router.patch(
  '/:id/read',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...notificationIdParamValidation, validateRequest],
  notificationsController.markRead
);
router.patch(
  '/read-all',
  requireRole(['ADMIN', 'SUPERVISOR']),
  notificationsController.readAll
);

module.exports = router;
