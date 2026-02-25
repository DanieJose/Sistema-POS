const express = require('express');
const { authJwt } = require('../../middlewares/authJwt');
const { requireRole } = require('../../middlewares/requireRole');
const { validateRequest } = require('../../middlewares/validateRequest');
const productsController = require('./products.controller');
const { adjustStockValidations, updateVariantValidations } = require('./products.validations');

const router = express.Router();

router.use(authJwt);

router.put(
  '/:variantId',
  requireRole(['ADMIN', 'SUPERVISOR']),
  [...updateVariantValidations, validateRequest],
  productsController.updateVariant
);

router.patch(
  '/:variantId/stock',
  requireRole(['SUPERVISOR', 'ADMIN']),
  [...adjustStockValidations, validateRequest],
  productsController.adjustVariantStock
);

module.exports = router;
