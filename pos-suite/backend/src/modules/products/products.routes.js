const express = require('express');
const { authJwt } = require('../../middlewares/authJwt');
const { requireRole } = require('../../middlewares/requireRole');
const { validateRequest } = require('../../middlewares/validateRequest');
const productsController = require('./products.controller');
const { upload } = require('./upload');
const {
  createProductValidations,
  listProductsValidations,
  productIdParamValidation,
  updateProductValidations,
  createVariantValidations,
  uploadImageValidations,
  uploadImagePostMulterValidations,
} = require('./products.validations');

const router = express.Router();

router.use(authJwt);

router.post(
  '/',
  requireRole(['ADMIN', 'SUPERVISOR']),
  [...createProductValidations, validateRequest],
  productsController.createProduct
);

router.get('/', [...listProductsValidations, validateRequest], productsController.listProducts);

router.get('/:id', [...productIdParamValidation, validateRequest], productsController.getProductById);

router.put(
  '/:id',
  requireRole(['ADMIN', 'SUPERVISOR']),
  [...updateProductValidations, validateRequest],
  productsController.updateProduct
);

router.delete(
  '/:id',
  requireRole(['ADMIN', 'SUPERVISOR']),
  [...productIdParamValidation, validateRequest],
  productsController.deleteProduct
);

router.post(
  '/:id/variants',
  requireRole(['ADMIN', 'SUPERVISOR']),
  [...createVariantValidations, validateRequest],
  productsController.createVariant
);

router.post(
  '/:id/images',
  requireRole(['ADMIN', 'SUPERVISOR']),
  [...uploadImageValidations, validateRequest],
  (req, res, next) => {
    upload.single('image')(req, res, (error) => {
      if (error) {
        return res.status(400).json({ ok: false, message: error.message });
      }
      return next();
    });
  },
  [...uploadImagePostMulterValidations, validateRequest],
  productsController.addProductImage
);

module.exports = router;
