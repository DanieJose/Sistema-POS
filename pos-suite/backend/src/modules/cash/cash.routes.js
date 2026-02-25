const express = require('express');

const { authJwt } = require('../../middlewares/authJwt');
const { requireRole } = require('../../middlewares/requireRole');
const { validateRequest } = require('../../middlewares/validateRequest');
const cashController = require('./cash.controller');
const { cashMovementValidations, closeCashValidations, openCashValidations } = require('./cash.validations');

const router = express.Router();

router.use(authJwt);

router.post(
  '/open',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...openCashValidations, validateRequest],
  cashController.openCash
);
router.get('/current', requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']), cashController.getCurrentCash);
router.post(
  '/movements',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...cashMovementValidations, validateRequest],
  cashController.createMovement
);
router.post(
  '/close',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...closeCashValidations, validateRequest],
  cashController.closeCash
);

module.exports = router;
