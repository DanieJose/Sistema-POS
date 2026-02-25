const express = require('express');

const { authJwt } = require('../../middlewares/authJwt');
const { requireRole } = require('../../middlewares/requireRole');
const { validateRequest } = require('../../middlewares/validateRequest');
const reportsController = require('./reports.controller');
const { dateRangeValidations } = require('./reports.validations');

const router = express.Router();

router.use(authJwt);

router.get(
  '/dashboard',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  reportsController.dashboard
);

router.get(
  '/financial-summary',
  requireRole(['ADMIN', 'SUPERVISOR']),
  [...dateRangeValidations, validateRequest],
  reportsController.financialSummary
);

router.get(
  '/inventory-investment',
  requireRole(['ADMIN', 'SUPERVISOR']),
  reportsController.inventoryInvestment
);

router.get('/by-category', requireRole(['ADMIN', 'SUPERVISOR']), reportsController.byCategory);
router.get(
  '/loyalty-summary',
  requireRole(['ADMIN', 'SUPERVISOR']),
  reportsController.loyaltySummary
);
router.get(
  '/tax-summary',
  requireRole(['ADMIN', 'SUPERVISOR']),
  [...dateRangeValidations, validateRequest],
  reportsController.taxSummary
);

module.exports = router;
