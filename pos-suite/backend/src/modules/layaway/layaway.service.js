const { sequelize } = require('../../config/mysql');
const { createAuditEvent } = require('../audit/audit.service');
const { ProductVariant } = require('../products/models');
const { getOrCreateStoreSettings } = require('../store_settings/store-settings.service');
const { Layaway, LayawayItem, LayawayPayment } = require('./models');

function toNumber(value) {
  return Number(value || 0);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function layawayIncludes() {
  return [
    {
      model: LayawayItem,
      as: 'items',
      include: [{ model: ProductVariant, as: 'variant' }],
    },
    {
      model: LayawayPayment,
      as: 'payments',
    },
  ];
}

async function getLayawayRules() {
  const settings = await getOrCreateStoreSettings();
  return {
    layawayDaysMax: Number(settings.layaway_days_max || 8),
    minDownPaymentAmount: Number(settings.layaway_min_down_payment_amount || 0),
    minDownPaymentPercent: Number(settings.layaway_min_down_payment_percent || 0),
  };
}

function computeMinDownPayment(totalAmount, rules) {
  const byPercent = totalAmount * (rules.minDownPaymentPercent / 100);
  return Math.max(rules.minDownPaymentAmount, byPercent);
}

async function createLayaway(payload, actorUserId) {
  const rules = await getLayawayRules();

  return sequelize.transaction(async (transaction) => {
    const variantIds = [...new Set(payload.items.map((item) => Number(item.product_variant_id)))];
    const variants = await ProductVariant.findAll({
      where: { id: variantIds, is_active: true },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (variants.length !== variantIds.length) {
      const error = new Error('One or more variants were not found or inactive');
      error.code = 'VARIANT_NOT_FOUND';
      throw error;
    }

    const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

    let totalAmount = 0;
    const normalizedItems = payload.items.map((item) => {
      const variant = variantsById.get(Number(item.product_variant_id));
      const quantity = Number(item.quantity);
      const unitPrice =
        item.unit_price !== undefined && item.unit_price !== null ? Number(item.unit_price) : Number(variant.price);

      if (quantity < 1) {
        const error = new Error('Invalid quantity');
        error.code = 'INVALID_QUANTITY';
        throw error;
      }

      if (Number(variant.stock) < quantity) {
        const error = new Error(`Insufficient stock for variant ${variant.id}`);
        error.code = 'INSUFFICIENT_STOCK';
        throw error;
      }

      totalAmount += unitPrice * quantity;

      return {
        product_variant_id: variant.id,
        quantity,
        unit_price: unitPrice,
        variant,
      };
    });

    totalAmount = Number(totalAmount.toFixed(2));
    const downPaymentAmount = Number(Number(payload.down_payment_amount).toFixed(2));
    const minDownPayment = Number(computeMinDownPayment(totalAmount, rules).toFixed(2));

    if (downPaymentAmount < minDownPayment) {
      const error = new Error(`Minimum down payment is ${minDownPayment}`);
      error.code = 'MIN_DOWN_PAYMENT';
      error.meta = { minDownPayment };
      throw error;
    }

    const remainingAmount = Number((totalAmount - downPaymentAmount).toFixed(2));
    if (remainingAmount < 0) {
      const error = new Error('remaining_amount cannot be negative');
      error.code = 'NEGATIVE_REMAINING';
      throw error;
    }

    for (const item of normalizedItems) {
      item.variant.stock = Number(item.variant.stock) - item.quantity;
      await item.variant.save({ transaction });
    }

    const dueDate = addDays(new Date(), rules.layawayDaysMax);
    const status = remainingAmount === 0 ? 'COMPLETED' : 'ACTIVE';

    const layaway = await Layaway.create(
      {
        customer_id: Number(payload.customer_id),
        status,
        total_amount: totalAmount,
        down_payment_amount: downPaymentAmount,
        remaining_amount: remainingAmount,
        due_date: dueDate,
        created_by_user_id: actorUserId,
      },
      { transaction }
    );

    await LayawayItem.bulkCreate(
      normalizedItems.map((item) => ({
        layaway_id: layaway.id,
        product_variant_id: item.product_variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
      { transaction }
    );

    if (downPaymentAmount > 0) {
      await LayawayPayment.create(
        {
          layaway_id: layaway.id,
          amount: downPaymentAmount,
          method: payload.payment_method || 'cash',
          reference: payload.payment_reference || null,
          created_by_user_id: actorUserId,
        },
        { transaction }
      );
    }

    await createAuditEvent({
      type: 'LAYAWAY_CREATE',
      actorUserId,
      payload: {
        layawayId: layaway.id,
        customer_id: layaway.customer_id,
        total_amount: totalAmount,
        down_payment_amount: downPaymentAmount,
        remaining_amount: remainingAmount,
      },
    });

    if (status === 'COMPLETED') {
      await createAuditEvent({
        type: 'LAYAWAY_COMPLETE',
        actorUserId,
        payload: { layawayId: layaway.id, source: 'create' },
      });
    }

    return getLayawayById(layaway.id, transaction);
  });
}

async function listLayaways(filters) {
  const where = {};
  if (filters.status) {
    where.status = filters.status;
  }

  return Layaway.findAll({
    where,
    include: [
      { model: LayawayItem, as: 'items' },
      { model: LayawayPayment, as: 'payments' },
    ],
    order: [['id', 'DESC']],
  });
}

async function getLayawayById(layawayId, transaction) {
  return Layaway.findByPk(layawayId, {
    include: layawayIncludes(),
    transaction,
  });
}

async function addLayawayPayment(layawayId, payload, actorUserId) {
  return sequelize.transaction(async (transaction) => {
    const layaway = await Layaway.findByPk(layawayId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!layaway) {
      const error = new Error('Layaway not found');
      error.code = 'LAYAWAY_NOT_FOUND';
      throw error;
    }

    if (layaway.status !== 'ACTIVE') {
      const error = new Error('Layaway is not active');
      error.code = 'LAYAWAY_NOT_ACTIVE';
      throw error;
    }

    const amount = Number(Number(payload.amount).toFixed(2));
    const remaining = Number(layaway.remaining_amount);
    const nextRemaining = Number((remaining - amount).toFixed(2));

    if (nextRemaining < 0) {
      const error = new Error('remaining_amount cannot be negative');
      error.code = 'NEGATIVE_REMAINING';
      throw error;
    }

    const payment = await LayawayPayment.create(
      {
        layaway_id: layaway.id,
        amount,
        method: payload.method,
        reference: payload.reference ?? null,
        created_by_user_id: actorUserId,
      },
      { transaction }
    );

    layaway.remaining_amount = nextRemaining;
    if (nextRemaining === 0) {
      layaway.status = 'COMPLETED';
    }
    await layaway.save({ transaction });

    await createAuditEvent({
      type: 'LAYAWAY_PAYMENT',
      actorUserId,
      payload: {
        layawayId: layaway.id,
        paymentId: payment.id,
        amount,
        method: payload.method,
        remaining_amount: nextRemaining,
      },
    });

    if (nextRemaining === 0) {
      await createAuditEvent({
        type: 'LAYAWAY_COMPLETE',
        actorUserId,
        payload: { layawayId: layaway.id, source: 'payment' },
      });
    }

    return getLayawayById(layaway.id, transaction);
  });
}

async function restoreLayawayStock(layawayId, transaction) {
  const items = await LayawayItem.findAll({
    where: { layaway_id: layawayId },
    transaction,
  });

  for (const item of items) {
    const variant = await ProductVariant.findByPk(item.product_variant_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!variant) {
      continue;
    }
    variant.stock = Number(variant.stock) + Number(item.quantity);
    await variant.save({ transaction });
  }
}

async function cancelLayaway(layawayId, actorUserId) {
  return sequelize.transaction(async (transaction) => {
    const layaway = await Layaway.findByPk(layawayId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!layaway) {
      const error = new Error('Layaway not found');
      error.code = 'LAYAWAY_NOT_FOUND';
      throw error;
    }

    if (layaway.status !== 'ACTIVE') {
      const error = new Error('Only ACTIVE layaways can be cancelled');
      error.code = 'INVALID_STATUS';
      throw error;
    }

    await restoreLayawayStock(layaway.id, transaction);
    layaway.status = 'CANCELLED';
    await layaway.save({ transaction });

    await createAuditEvent({
      type: 'LAYAWAY_CANCEL',
      actorUserId,
      payload: { layawayId: layaway.id },
    });

    return getLayawayById(layaway.id, transaction);
  });
}

async function runExpirationJob(actorUserId) {
  return sequelize.transaction(async (transaction) => {
    const now = new Date();
    const layaways = await Layaway.findAll({
      where: {
        status: 'ACTIVE',
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const expiredIds = [];

    for (const layaway of layaways) {
      if (now > new Date(layaway.due_date)) {
        await restoreLayawayStock(layaway.id, transaction);
        layaway.status = 'EXPIRED';
        await layaway.save({ transaction });
        expiredIds.push(layaway.id);

        await createAuditEvent({
          type: 'LAYAWAY_EXPIRE',
          actorUserId,
          payload: { layawayId: layaway.id },
        });
      }
    }

    return { expiredIds, count: expiredIds.length };
  });
}

module.exports = {
  createLayaway,
  listLayaways,
  getLayawayById,
  addLayawayPayment,
  cancelLayaway,
  runExpirationJob,
};
