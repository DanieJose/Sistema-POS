function serializeProduct(productInstance) {
  const product = productInstance.toJSON ? productInstance.toJSON() : productInstance;

  return {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    is_active: product.is_active,
    created_at: product.created_at,
    updated_at: product.updated_at,
    variants: Array.isArray(product.variants)
      ? product.variants.map((variant) => ({
          id: variant.id,
          product_id: variant.product_id,
          sku: variant.sku,
          color: variant.color,
          size: variant.size,
          tone: variant.tone,
          model: variant.model,
          cost: variant.cost,
          price: variant.price,
          stock: variant.stock,
          expires_at: variant.expires_at,
          is_active: variant.is_active,
          created_at: variant.created_at,
          updated_at: variant.updated_at,
        }))
      : undefined,
    images: Array.isArray(product.images)
      ? product.images.map((image) => ({
          id: image.id,
          product_id: image.product_id,
          image_url: image.image_url,
          sort_order: image.sort_order,
          created_at: image.created_at,
          updated_at: image.updated_at,
        }))
      : undefined,
  };
}

function serializeVariant(variantInstance) {
  const variant = variantInstance.toJSON ? variantInstance.toJSON() : variantInstance;
  return {
    id: variant.id,
    product_id: variant.product_id,
    sku: variant.sku,
    color: variant.color,
    size: variant.size,
    tone: variant.tone,
    model: variant.model,
    cost: variant.cost,
    price: variant.price,
    stock: variant.stock,
    expires_at: variant.expires_at,
    is_active: variant.is_active,
    created_at: variant.created_at,
    updated_at: variant.updated_at,
  };
}

function serializeImage(imageInstance) {
  const image = imageInstance.toJSON ? imageInstance.toJSON() : imageInstance;
  return {
    id: image.id,
    product_id: image.product_id,
    image_url: image.image_url,
    sort_order: image.sort_order,
    created_at: image.created_at,
    updated_at: image.updated_at,
  };
}

module.exports = { serializeProduct, serializeVariant, serializeImage };
