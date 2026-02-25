const fs = require('fs');
const express = require('express');

const { authJwt } = require('../../middlewares/authJwt');
const { requireRole } = require('../../middlewares/requireRole');
const { validateRequest } = require('../../middlewares/validateRequest');
const productsController = require('./products.controller');
const { imageIdParamValidation } = require('./products.validations');

const router = express.Router();

router.use(authJwt);

router.delete(
  '/:imageId',
  requireRole(['ADMIN', 'SUPERVISOR']),
  [...imageIdParamValidation, validateRequest],
  productsController.deleteProductImage
);

module.exports = router;
