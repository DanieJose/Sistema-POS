const express = require('express');

const { authJwt } = require('../../middlewares/authJwt');
const { requireRole } = require('../../middlewares/requireRole');
const { validateRequest } = require('../../middlewares/validateRequest');
const salesController = require('./sales.controller');
const { createSaleValidations, listSalesValidations, saleIdParamValidation } = require('./sales.validations');

const router = express.Router();

router.use(authJwt);

router.post(
  '/',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...createSaleValidations, validateRequest],
  salesController.createSale
);
router.get(
  '/',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...listSalesValidations, validateRequest],
  salesController.listSales
);
router.get(
  '/:id',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...saleIdParamValidation, validateRequest],
  salesController.getSaleById
);
router.post(
  '/:id/void',
  requireRole(['ADMIN', 'SUPERVISOR']),
  [...saleIdParamValidation, validateRequest],
  salesController.voidSale
);

module.exports = router;
