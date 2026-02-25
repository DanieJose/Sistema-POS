const express = require('express');

const { authJwt } = require('../../middlewares/authJwt');
const { requireRole } = require('../../middlewares/requireRole');
const { validateRequest } = require('../../middlewares/validateRequest');
const layawayController = require('./layaway.controller');
const {
  createLayawayValidations,
  listLayawaysValidations,
  layawayIdParamValidation,
  createPaymentValidations,
  cancelLayawayValidations,
} = require('./layaway.validations');

const router = express.Router();

router.use(authJwt);

router.post(
  '/',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...createLayawayValidations, validateRequest],
  layawayController.createLayaway
);

router.get(
  '/',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...listLayawaysValidations, validateRequest],
  layawayController.listLayaways
);

router.get(
  '/:id',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...layawayIdParamValidation, validateRequest],
  layawayController.getLayawayById
);

router.post(
  '/:id/payments',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...createPaymentValidations, validateRequest],
  layawayController.createPayment
);

router.post(
  '/:id/cancel',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...cancelLayawayValidations, validateRequest],
  layawayController.cancelLayaway
);

router.post(
  '/run-expiration-job',
  requireRole(['ADMIN']),
  layawayController.runExpirationJob
);

module.exports = router;
