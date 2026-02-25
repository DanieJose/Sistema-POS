const productsService = require('./products.service');
const { serializeProduct, serializeVariant, serializeImage } = require('./serializers');

async function createProduct(req, res) {
  const product = await productsService.createProduct(req.body, req.user.id);
  return res.status(201).json({ ok: true, data: serializeProduct(product) });
}

async function listProducts(req, res) {
  const products = await productsService.listProducts({
    category: req.query.category,
    search: req.query.search,
    is_active:
      req.query.is_active === undefined ? undefined : req.query.is_active === true || req.query.is_active === 'true',
  });

  return res.json({ ok: true, data: products.map(serializeProduct) });
}

async function getProductById(req, res) {
  const product = await productsService.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ ok: false, message: 'Product not found' });
  }

  return res.json({ ok: true, data: serializeProduct(product) });
}

async function updateProduct(req, res) {
  const product = await productsService.updateProduct(req.params.id, req.body, req.user.id);
  if (!product) {
    return res.status(404).json({ ok: false, message: 'Product not found' });
  }

  return res.json({ ok: true, data: serializeProduct(product) });
}

async function deleteProduct(req, res) {
  const product = await productsService.softDeleteProduct(req.params.id, req.user.id);
  if (!product) {
    return res.status(404).json({ ok: false, message: 'Product not found' });
  }

  return res.json({ ok: true, data: serializeProduct(product) });
}

async function createVariant(req, res) {
  const result = await productsService.createVariant(req.params.id, req.body, req.user.id);
  if (result.error === 'PRODUCT_NOT_FOUND') {
    return res.status(404).json({ ok: false, message: 'Product not found' });
  }
  if (result.error === 'SKU_EXISTS') {
    return res.status(409).json({ ok: false, message: 'SKU already exists' });
  }

  return res.status(201).json({ ok: true, data: serializeVariant(result.variant) });
}

async function updateVariant(req, res) {
  const result = await productsService.updateVariant(req.params.variantId, req.body, req.user.id);
  if (result.error === 'VARIANT_NOT_FOUND') {
    return res.status(404).json({ ok: false, message: 'Variant not found' });
  }
  if (result.error === 'SKU_EXISTS') {
    return res.status(409).json({ ok: false, message: 'SKU already exists' });
  }

  return res.json({ ok: true, data: serializeVariant(result.variant) });
}

async function adjustVariantStock(req, res) {
  const result = await productsService.adjustVariantStock(
    req.params.variantId,
    req.body.delta,
    req.body.reason,
    req.user.id
  );

  if (result.error === 'VARIANT_NOT_FOUND') {
    return res.status(404).json({ ok: false, message: 'Variant not found' });
  }
  if (result.error === 'NEGATIVE_STOCK') {
    return res.status(400).json({ ok: false, message: 'Stock cannot be negative' });
  }

  return res.json({
    ok: true,
    data: serializeVariant(result.variant),
    stock_adjustment: {
      delta: Number(req.body.delta),
      reason: req.body.reason,
      previous_stock: result.previousStock,
      new_stock: result.newStock,
    },
  });
}

async function addProductImage(req, res) {
  const result = await productsService.addProductImage(
    req.params.id,
    req.file,
    req.body.sort_order,
    req.user.id
  );

  if (result.error === 'PRODUCT_NOT_FOUND') {
    return res.status(404).json({ ok: false, message: 'Product not found' });
  }
  if (result.error === 'FILE_REQUIRED') {
    return res.status(400).json({ ok: false, message: 'image file is required' });
  }

  return res.status(201).json({ ok: true, data: serializeImage(result.image) });
}

async function deleteProductImage(req, res) {
  const result = await productsService.deleteProductImage(req.params.imageId, req.user.id);
  if (result.error === 'IMAGE_NOT_FOUND') {
    return res.status(404).json({ ok: false, message: 'Image not found' });
  }

  return res.json({ ok: true });
}

module.exports = {
  createProduct,
  listProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  createVariant,
  updateVariant,
  adjustVariantStock,
  addProductImage,
  deleteProductImage,
};
