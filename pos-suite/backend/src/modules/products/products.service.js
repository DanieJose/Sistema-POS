const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');

const { createAuditEvent } = require('../audit/audit.service');
const { Product, ProductImage, ProductVariant } = require('./models');

function productIncludes() {
  return [
    { model: ProductVariant, as: 'variants' },
    { model: ProductImage, as: 'images' },
  ];
}

async function createProduct(payload, actorUserId) {
  const product = await Product.create({
    name: payload.name,
    category: payload.category,
    description: payload.description ?? null,
    is_active: typeof payload.is_active === 'boolean' ? payload.is_active : true,
  });

  await createAuditEvent({
    type: 'PRODUCT_CREATE',
    actorUserId,
    payload: { productId: product.id, name: product.name, category: product.category },
  });

  return product;
}

async function listProducts(filters) {
  const where = {};

  if (filters.category) {
    where.category = filters.category;
  }

  if (typeof filters.is_active === 'boolean') {
    where.is_active = filters.is_active;
  }

  if (filters.search) {
    const like = `%${filters.search}%`;
    where[Op.or] = [
      { name: { [Op.like]: like } },
      { description: { [Op.like]: like } },
      { category: { [Op.like]: like } },
    ];
  }

  return Product.findAll({
    where,
    order: [['id', 'DESC']],
  });
}

async function getProductById(productId) {
  return Product.findByPk(productId, {
    include: productIncludes(),
  });
}

async function updateProduct(productId, payload, actorUserId) {
  const product = await Product.findByPk(productId);
  if (!product) {
    return null;
  }

  const fields = ['name', 'category', 'description', 'is_active'];
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      product[field] = payload[field];
    }
  }

  await product.save();

  await createAuditEvent({
    type: 'PRODUCT_UPDATE',
    actorUserId,
    payload: { productId: product.id, changes: payload },
  });

  return product;
}

async function softDeleteProduct(productId, actorUserId) {
  const product = await Product.findByPk(productId);
  if (!product) {
    return null;
  }

  product.is_active = false;
  await product.save();

  await createAuditEvent({
    type: 'PRODUCT_DELETE',
    actorUserId,
    payload: { productId: product.id },
  });

  return product;
}

async function createVariant(productId, payload, actorUserId) {
  const product = await Product.findByPk(productId);
  if (!product) {
    return { error: 'PRODUCT_NOT_FOUND' };
  }

  const existingSku = await ProductVariant.findOne({ where: { sku: payload.sku } });
  if (existingSku) {
    return { error: 'SKU_EXISTS' };
  }

  const variant = await ProductVariant.create({
    product_id: product.id,
    sku: payload.sku,
    color: payload.color ?? null,
    size: payload.size ?? null,
    tone: payload.tone ?? null,
    model: payload.model ?? null,
    cost: payload.cost ?? 0,
    price: payload.price,
    stock: payload.stock ?? 0,
    expires_at: payload.expires_at ?? null,
    is_active: typeof payload.is_active === 'boolean' ? payload.is_active : true,
  });

  await createAuditEvent({
    type: 'VARIANT_CREATE',
    actorUserId,
    payload: { productId: product.id, variantId: variant.id, sku: variant.sku },
  });

  return { variant };
}

async function updateVariant(variantId, payload, actorUserId) {
  const variant = await ProductVariant.findByPk(variantId);
  if (!variant) {
    return { error: 'VARIANT_NOT_FOUND' };
  }

  if (payload.sku && payload.sku !== variant.sku) {
    const existingSku = await ProductVariant.findOne({ where: { sku: payload.sku } });
    if (existingSku && existingSku.id !== variant.id) {
      return { error: 'SKU_EXISTS' };
    }
  }

  const fields = [
    'sku',
    'color',
    'size',
    'tone',
    'model',
    'cost',
    'price',
    'stock',
    'expires_at',
    'is_active',
  ];
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      variant[field] = payload[field];
    }
  }

  await variant.save();

  await createAuditEvent({
    type: 'VARIANT_UPDATE',
    actorUserId,
    payload: { variantId: variant.id, productId: variant.product_id, changes: payload },
  });

  return { variant };
}

async function adjustVariantStock(variantId, delta, reason, actorUserId) {
  const variant = await ProductVariant.findByPk(variantId);
  if (!variant) {
    return { error: 'VARIANT_NOT_FOUND' };
  }

  const nextStock = Number(variant.stock) + Number(delta);
  if (nextStock < 0) {
    return { error: 'NEGATIVE_STOCK' };
  }

  const previousStock = Number(variant.stock);
  variant.stock = nextStock;
  await variant.save();

  await createAuditEvent({
    type: 'STOCK_ADJUST',
    actorUserId,
    payload: {
      variantId: variant.id,
      productId: variant.product_id,
      delta: Number(delta),
      reason,
      previousStock,
      newStock: nextStock,
    },
  });

  return { variant, previousStock, newStock: nextStock };
}

async function addProductImage(productId, file, sortOrder, actorUserId) {
  const product = await Product.findByPk(productId);
  if (!product) {
    return { error: 'PRODUCT_NOT_FOUND' };
  }

  if (!file) {
    return { error: 'FILE_REQUIRED' };
  }

  const image = await ProductImage.create({
    product_id: product.id,
    image_url: `/uploads/${file.filename}`,
    sort_order: sortOrder ?? 0,
  });

  await createAuditEvent({
    type: 'IMAGE_ADD',
    actorUserId,
    payload: { productId: product.id, imageId: image.id, image_url: image.image_url },
  });

  return { image };
}

async function deleteProductImage(imageId, actorUserId) {
  const image = await ProductImage.findByPk(imageId);
  if (!image) {
    return { error: 'IMAGE_NOT_FOUND' };
  }

  const imagePath =
    image.image_url && image.image_url.startsWith('/uploads/')
      ? path.join(__dirname, '../../../', image.image_url.replace(/^\//, '').replace(/\//g, path.sep))
      : null;

  const payload = {
    imageId: image.id,
    productId: image.product_id,
    image_url: image.image_url,
  };

  await image.destroy();

  if (imagePath) {
    fs.promises.unlink(imagePath).catch(() => {});
  }

  await createAuditEvent({
    type: 'IMAGE_DELETE',
    actorUserId,
    payload,
  });

  return { ok: true };
}

module.exports = {
  createProduct,
  listProducts,
  getProductById,
  updateProduct,
  softDeleteProduct,
  createVariant,
  updateVariant,
  adjustVariantStock,
  addProductImage,
  deleteProductImage,
};
