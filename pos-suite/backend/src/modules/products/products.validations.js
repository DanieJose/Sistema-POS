const { body, param, query } = require('express-validator');

const createProductValidations = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('category').trim().notEmpty().withMessage('category is required'),
  body('description').optional({ nullable: true }).isString(),
  body('is_active').optional().isBoolean(),
];

const listProductsValidations = [
  query('category').optional().isString(),
  query('search').optional().isString(),
  query('is_active').optional().isBoolean().toBoolean(),
];

const productIdParamValidation = [param('id').isInt({ min: 1 })];

const updateProductValidations = [
  ...productIdParamValidation,
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
  body('category').optional().trim().notEmpty().withMessage('category cannot be empty'),
  body('description').optional({ nullable: true }).isString(),
  body('is_active').optional().isBoolean(),
];

const createVariantValidations = [
  ...productIdParamValidation,
  body('sku').trim().notEmpty().withMessage('sku is required'),
  body('color').optional({ nullable: true }).isString(),
  body('size').optional({ nullable: true }).isString(),
  body('tone').optional({ nullable: true }).isString(),
  body('model').optional({ nullable: true }).isString(),
  body('cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('cost must be a number >= 0'),
  body('price')
    .exists()
    .withMessage('price is required')
    .bail()
    .isFloat({ min: 0 })
    .withMessage('price must be a number >= 0'),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('stock must be an integer >= 0'),
  body('expires_at').optional({ nullable: true }).isISO8601().withMessage('expires_at must be a valid date'),
  body('is_active').optional().isBoolean(),
];

const variantIdParamValidation = [param('variantId').isInt({ min: 1 })];

const updateVariantValidations = [
  ...variantIdParamValidation,
  body('sku').optional().trim().notEmpty().withMessage('sku cannot be empty'),
  body('color').optional({ nullable: true }).isString(),
  body('size').optional({ nullable: true }).isString(),
  body('tone').optional({ nullable: true }).isString(),
  body('model').optional({ nullable: true }).isString(),
  body('cost').optional().isFloat({ min: 0 }).withMessage('cost must be a number >= 0'),
  body('price').optional().isFloat({ min: 0 }).withMessage('price must be a number >= 0'),
  body('stock').optional().isInt({ min: 0 }).withMessage('stock must be an integer >= 0'),
  body('expires_at').optional({ nullable: true }).isISO8601().withMessage('expires_at must be a valid date'),
  body('is_active').optional().isBoolean(),
];

const adjustStockValidations = [
  ...variantIdParamValidation,
  body('delta').isInt().withMessage('delta must be integer'),
  body('reason').trim().notEmpty().withMessage('reason is required'),
];

const uploadImageValidations = [...productIdParamValidation];
const uploadImagePostMulterValidations = [body('sort_order').optional().isInt().withMessage('sort_order must be integer')];
const imageIdParamValidation = [param('imageId').isInt({ min: 1 })];

module.exports = {
  createProductValidations,
  listProductsValidations,
  productIdParamValidation,
  updateProductValidations,
  createVariantValidations,
  updateVariantValidations,
  adjustStockValidations,
  uploadImageValidations,
  uploadImagePostMulterValidations,
  imageIdParamValidation,
};
