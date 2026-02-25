const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = Number(process.env.DB_PORT) || 3306;
const dbUser = (process.env.DB_USER || '').trim();
const dbName = (process.env.DB_NAME || '').trim();

console.log('MySQL env config:', {
  host: dbHost,
  port: dbPort,
  user: dbUser || '(empty)',
  name: dbName || '(empty)',
});

if (!dbUser) {
  console.error('DB_USER is empty');
  process.exit(1);
}

const { sequelize } = require('../config/mysql');
const { Product, ProductVariant } = require('../modules/products/models');

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

const PRODUCT_SEED = [
  {
    name: 'Anillo Elegance',
    category: 'joyeria',
    description: 'Anillo decorativo para uso diario.',
    variants: [
      {
        sku: 'JOY-ANILLO-001',
        color: 'dorado',
        size: '6',
        model: 'Elegance',
        cost: 180,
        price: 350,
        stock: 12,
      },
      {
        sku: 'JOY-ANILLO-002',
        color: 'plata',
        size: '7',
        model: 'Elegance',
        cost: 175,
        price: 340,
        stock: 10,
      },
    ],
  },
  {
    name: 'Labial Matte Pro',
    category: 'maquillaje',
    description: 'Labial matte de larga duración.',
    variants: [
      {
        sku: 'MAQ-LABIAL-001',
        tone: 'rojo cereza',
        model: 'Matte Pro',
        cost: 90,
        price: 180,
        stock: 25,
      },
      {
        sku: 'MAQ-LABIAL-002',
        tone: 'nude rose',
        model: 'Matte Pro',
        cost: 90,
        price: 180,
        stock: 22,
      },
    ],
  },
  {
    name: 'Crema Hidratante Daily',
    category: 'skincare',
    description: 'Crema hidratante facial para uso diario.',
    variants: [
      {
        sku: 'SKN-CREMA-001',
        model: '50ml',
        cost: 140,
        price: 290,
        stock: 18,
        expires_at: addMonths(new Date(), 6),
      },
      {
        sku: 'SKN-CREMA-002',
        model: '100ml',
        cost: 220,
        price: 420,
        stock: 14,
        expires_at: addMonths(new Date(), 6),
      },
    ],
  },
  {
    name: 'Tenis Urban Flex',
    category: 'zapatos',
    description: 'Tenis casuales unisex.',
    variants: [
      {
        sku: 'ZAP-TENIS-001',
        color: 'negro',
        size: '38',
        model: 'Urban Flex',
        cost: 480,
        price: 850,
        stock: 8,
      },
      {
        sku: 'ZAP-TENIS-002',
        color: 'blanco',
        size: '39',
        model: 'Urban Flex',
        cost: 480,
        price: 850,
        stock: 9,
      },
    ],
  },
  {
    name: 'Bolso Classic',
    category: 'carteras',
    description: 'Bolso mediano para uso diario.',
    variants: [
      {
        sku: 'CAR-BOLSO-001',
        color: 'beige',
        model: 'Classic',
        cost: 320,
        price: 620,
        stock: 11,
      },
      {
        sku: 'CAR-BOLSO-002',
        color: 'negro',
        model: 'Classic',
        cost: 320,
        price: 620,
        stock: 13,
      },
    ],
  },
];

async function upsertProduct(productSeed) {
  const [product, created] = await Product.findOrCreate({
    where: {
      name: productSeed.name,
      category: productSeed.category,
    },
    defaults: {
      name: productSeed.name,
      category: productSeed.category,
      description: productSeed.description || null,
      is_active: true,
    },
  });

  if (!created) {
    product.description = productSeed.description || product.description || null;
    product.is_active = true;
    await product.save();
  }

  let createdVariants = 0;
  let updatedVariants = 0;

  for (const variantSeed of productSeed.variants) {
    const [variant, variantCreated] = await ProductVariant.findOrCreate({
      where: { sku: variantSeed.sku },
      defaults: {
        product_id: product.id,
        sku: variantSeed.sku,
        color: variantSeed.color || null,
        size: variantSeed.size || null,
        tone: variantSeed.tone || null,
        model: variantSeed.model || null,
        cost: variantSeed.cost,
        price: variantSeed.price,
        stock: variantSeed.stock,
        expires_at: variantSeed.expires_at || null,
        is_active: true,
      },
    });

    if (variantCreated) {
      createdVariants += 1;
      continue;
    }

    variant.product_id = product.id;
    variant.color = variantSeed.color || null;
    variant.size = variantSeed.size || null;
    variant.tone = variantSeed.tone || null;
    variant.model = variantSeed.model || null;
    variant.cost = variantSeed.cost;
    variant.price = variantSeed.price;
    variant.stock = variantSeed.stock;
    variant.expires_at = variantSeed.expires_at || null;
    variant.is_active = true;
    await variant.save();
    updatedVariants += 1;
  }

  return { product, createdProduct: created, createdVariants, updatedVariants };
}

async function main() {
  console.log('Connecting to MySQL...');
  await sequelize.authenticate();
  console.log('MySQL connection OK');

  let createdProducts = 0;
  let touchedProducts = 0;
  let createdVariants = 0;
  let updatedVariants = 0;

  for (const productSeed of PRODUCT_SEED) {
    const result = await upsertProduct(productSeed);
    touchedProducts += 1;
    if (result.createdProduct) createdProducts += 1;
    createdVariants += result.createdVariants;
    updatedVariants += result.updatedVariants;
    console.log(
      `[${result.createdProduct ? 'CREATED' : 'UPDATED'}] ${result.product.category} - ${result.product.name} | variants +${result.createdVariants} / ~${result.updatedVariants}`
    );
  }

  console.log('Seed completed:', {
    products_processed: touchedProducts,
    products_created: createdProducts,
    variants_created: createdVariants,
    variants_updated: updatedVariants,
  });
}

main()
  .catch((error) => {
    console.error('seed:products failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
      console.log('MySQL connection closed');
    } catch (error) {
      console.error('Failed to close MySQL connection', error);
    }
  });
