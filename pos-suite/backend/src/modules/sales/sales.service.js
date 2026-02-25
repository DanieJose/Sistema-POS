const { Op } = require('sequelize');
const { sequelize } = require('../../config/mysql');
const { createAuditEvent } = require('../audit/audit.service');
const { CashSession } = require('../cash/models');
const { ProductVariant } = require('../products/models');
const { getLoyaltyRules } = require('../loyalty/loyalty.settings');
const { Customer, LoyaltyTransaction, LoyaltyWallet } = require('../loyalty/models');
const { getOrCreateStoreSettings } = require('../store_settings/store-settings.service');
const { Sale, SaleItem, SalePayment } = require('./models');

function round2(v) {
  return Number(Number(v).toFixed(2));
}

function normalizeRate(v) {
  const n = Number(v || 0);
  return n > 1 ? n / 100 : n;
}

function discountLimitForRole(settings, role) {
  if (role === 'ADMIN') return Number(settings.discount_limit_admin ?? 100);
  if (role === 'SUPERVISOR') return Number(settings.discount_limit_supervisor ?? 20);
  return Number(settings.discount_limit_cashier ?? 0);
}

async function getOpenCashSession(transaction) {
  return CashSession.findOne({
    where: { status: 'OPEN' },
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
}

async function nextSaleNumber(transaction) {
  const d = new Date();
  const prefix = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const last = await Sale.findOne({
    where: { sale_number: { [Op.like]: `${prefix}-%` } },
    order: [['sale_number', 'DESC']],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
  let seq = 1;
  if (last?.sale_number) {
    const parts = String(last.sale_number).split('-');
    seq = Number(parts[1] || 0) + 1;
  }
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

async function getSaleById(id) {
  return Sale.findByPk(id, {
    include: [
      { model: SaleItem, as: 'items', include: [{ model: ProductVariant, as: 'variant' }] },
      { model: SalePayment, as: 'payments' },
    ],
  });
}

async function listSales(filters) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.date_from || filters.date_to) {
    where.created_at = {};
    if (filters.date_from) where.created_at[Op.gte] = new Date(filters.date_from);
    if (filters.date_to) where.created_at[Op.lte] = new Date(filters.date_to);
  }
  return Sale.findAll({
    where,
    include: [{ model: SaleItem, as: 'items' }, { model: SalePayment, as: 'payments' }],
    order: [['id', 'DESC']],
  });
}

async function createSale(payload, actor) {
  const [settings, loyaltyRules] = await Promise.all([getOrCreateStoreSettings(), getLoyaltyRules()]);
  const isvRate = normalizeRate(settings.isv_rate);
  const cardSurchargeRate = normalizeRate(settings.card_surcharge_rate);
  const pricesIncludeIsv = Boolean(settings.prices_include_isv);

  return sequelize.transaction(async (transaction) => {
    const cashSession = await getOpenCashSession(transaction);
    if (!cashSession) {
      const e = new Error('No OPEN cash session');
      e.code = 'CASH_NOT_OPEN';
      throw e;
    }

    const variantIds = [...new Set(payload.items.map((i) => Number(i.variant_id)))];
    const variants = await ProductVariant.findAll({
      where: { id: variantIds, is_active: true },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (variants.length !== variantIds.length) {
      const e = new Error('One or more variants not found/inactive');
      e.code = 'VARIANT_NOT_FOUND';
      throw e;
    }
    const map = new Map(variants.map((v) => [v.id, v]));

    let subtotal = 0;
    let costTotal = 0;
    let lineDiscountTotal = 0;
    const normalizedItems = payload.items.map((item) => {
      const variant = map.get(Number(item.variant_id));
      const qty = Number(item.quantity);
      const unitPrice = Number(variant.price);
      const unitCost = Number(variant.cost);
      const lineSubtotal = round2(unitPrice * qty);
      const lineDiscount = round2(Number(item.line_discount_amount || 0));
      if (lineDiscount > lineSubtotal) {
        const e = new Error('line discount cannot exceed line subtotal');
        e.code = 'DISCOUNT_INVALID';
        throw e;
      }
      if (Number(variant.stock) < qty) {
        const e = new Error(`Insufficient stock for variant ${variant.id}`);
        e.code = 'INSUFFICIENT_STOCK';
        throw e;
      }
      subtotal = round2(subtotal + lineSubtotal);
      costTotal = round2(costTotal + unitCost * qty);
      lineDiscountTotal = round2(lineDiscountTotal + lineDiscount);
      return { variant, qty, unitPrice, unitCost, lineSubtotal, lineDiscount };
    });

    const saleDiscountTotal = round2(Number(payload.sale_discount_total || 0));
    const discountTotal = round2(lineDiscountTotal + saleDiscountTotal);
    if (discountTotal > subtotal) {
      const e = new Error('discount_total cannot exceed subtotal');
      e.code = 'DISCOUNT_INVALID';
      throw e;
    }

    const maxDiscountPercent = discountLimitForRole(settings, actor.role);
    const appliedDiscountPercent = subtotal > 0 ? (discountTotal / subtotal) * 100 : 0;
    if (appliedDiscountPercent > maxDiscountPercent + 0.0001) {
      const e = new Error(`Discount exceeds role limit (${maxDiscountPercent}%)`);
      e.code = 'DISCOUNT_LIMIT';
      e.meta = { max_discount_percent: maxDiscountPercent };
      throw e;
    }

    const payments = payload.payments || [];
    let cardAmount = 0;
    let transferAmount = 0;
    let cashAmount = 0;
    let pointsUsed = 0;
    for (const p of payments) {
      if (p.method === 'points') {
        pointsUsed = round2(pointsUsed + Number(p.points_used || 0));
      } else {
        const amt = round2(Number(p.amount_lempiras || 0));
        if (p.method === 'cash') cashAmount = round2(cashAmount + amt);
        if (p.method === 'card') cardAmount = round2(cardAmount + amt);
        if (p.method === 'transfer') transferAmount = round2(transferAmount + amt);
        if (p.method === 'transfer' && !p.reference) {
          const e = new Error('Transfer payments require reference');
          e.code = 'PAYMENT_REFERENCE_REQUIRED';
          throw e;
        }
      }
    }

    const surchargeTotal = round2(cardAmount * cardSurchargeRate);
    const baseAfterDiscount = round2(subtotal - discountTotal);
    let taxTotal = 0;
    let total = 0;
    if (pricesIncludeIsv) {
      total = round2(baseAfterDiscount + surchargeTotal);
      taxTotal = round2(total * (isvRate / (1 + isvRate)));
    } else {
      taxTotal = round2((baseAfterDiscount + surchargeTotal) * isvRate);
      total = round2(baseAfterDiscount + surchargeTotal + taxTotal);
    }

    const pointsValue = normalizeRate(0) + Number(loyaltyRules.loyalty_point_value || 1); // keep numeric coercion simple
    const pointsLeMP = round2(pointsUsed * pointsValue);
    const moneyPaid = round2(cashAmount + cardAmount + transferAmount);
    const paidTotal = round2(moneyPaid + pointsLeMP);
    if (Math.abs(paidTotal - total) > 0.01) {
      const e = new Error(`Payments total ${paidTotal} does not match sale total ${total}`);
      e.code = 'PAYMENT_TOTAL_MISMATCH';
      throw e;
    }

    let customer = null;
    let wallet = null;
    if (payload.customer_id) {
      customer = await Customer.findByPk(payload.customer_id, {
        include: [{ model: LoyaltyWallet, as: 'wallet' }],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!customer) {
        const e = new Error('Customer not found');
        e.code = 'CUSTOMER_NOT_FOUND';
        throw e;
      }
      wallet = customer.wallet;
    }

    if (pointsUsed > 0) {
      if (!customer || !wallet) {
        const e = new Error('Points payment requires customer');
        e.code = 'POINTS_REQUIRE_CUSTOMER';
        throw e;
      }
      if (!loyaltyRules.loyalty_allow_pay_with_points) {
        const e = new Error('Points payment disabled');
        e.code = 'POINTS_DISABLED';
        throw e;
      }
      if (pointsUsed < Number(loyaltyRules.loyalty_min_redeem_amount || 0)) {
        const e = new Error('Points below minimum redeem amount');
        e.code = 'POINTS_MIN_REDEEM';
        throw e;
      }
      if (pointsUsed > Number(wallet.balance_points)) {
        const e = new Error('Insufficient points balance');
        e.code = 'INSUFFICIENT_POINTS';
        throw e;
      }
      const maxDiscountL = round2(total * (Number(loyaltyRules.loyalty_max_points_percent_per_sale || 0) / 100));
      if (pointsLeMP > maxDiscountL) {
        const e = new Error('Points exceed max percent per sale');
        e.code = 'POINTS_MAX_PERCENT';
        throw e;
      }
      if (moneyPaid > 0 && !loyaltyRules.loyalty_allow_mixed_payment) {
        const e = new Error('Mixed payment disabled');
        e.code = 'MIXED_DISABLED';
        throw e;
      }
    }

    for (const item of normalizedItems) {
      item.variant.stock = Number(item.variant.stock) - item.qty;
      await item.variant.save({ transaction });
      await createAuditEvent({
        type: 'STOCK_DEDUCT_FROM_SALE',
        actorUserId: actor.id,
        payload: { variantId: item.variant.id, delta: -item.qty },
      });
    }

    const sale = await Sale.create(
      {
        sale_number: await nextSaleNumber(transaction),
        customer_id: payload.customer_id ?? null,
        cash_session_id: cashSession.id,
        subtotal,
        discount_total: discountTotal,
        surcharge_total: surchargeTotal,
        tax_total: taxTotal,
        total,
        cost_total: costTotal,
        profit_gross: round2(total - costTotal - discountTotal),
        status: 'COMPLETED',
        created_by_user_id: actor.id,
      },
      { transaction }
    );

    await SaleItem.bulkCreate(
      normalizedItems.map((item) => ({
        sale_id: sale.id,
        product_variant_id: item.variant.id,
        quantity: item.qty,
        unit_price: item.unitPrice,
        unit_cost: item.unitCost,
        line_subtotal: item.lineSubtotal,
        line_discount: item.lineDiscount,
      })),
      { transaction }
    );

    const paymentRows = [];
    for (const p of payments) {
      if (p.method === 'points') {
        const pts = round2(Number(p.points_used || 0));
        if (pts <= 0) continue;
        paymentRows.push({
          sale_id: sale.id,
          method: 'points',
          amount_lempiras: round2(pts * pointsValue),
          points_used: pts,
          reference: null,
        });
      } else {
        paymentRows.push({
          sale_id: sale.id,
          method: p.method,
          amount_lempiras: round2(Number(p.amount_lempiras || 0)),
          points_used: null,
          reference: p.reference ?? null,
        });
      }
    }
    if (paymentRows.length) await SalePayment.bulkCreate(paymentRows, { transaction });

    if (pointsUsed > 0 && wallet) {
      wallet.balance_points = round2(Number(wallet.balance_points) - pointsUsed);
      await wallet.save({ transaction });
      await LoyaltyTransaction.create(
        {
          customer_id: customer.id,
          type: 'REDEEM',
          points: -pointsUsed,
          amount_lempiras: pointsLeMP,
          payment_method: 'none',
          reference: null,
          related_sale_id: sale.id,
          related_layaway_id: null,
          created_by_user_id: actor.id,
          reason: 'Redeem in sale',
        },
        { transaction }
      );
    }

    if (customer && moneyPaid > 0) {
      const earnRatePts = Number(loyaltyRules.loyalty_earn_rate_points || 1);
      const earnRateL = Number(loyaltyRules.loyalty_earn_rate_lempiras || 10);
      const earnBuckets = earnRateL > 0 ? Math.floor(moneyPaid / earnRateL) : 0;
      const pointsEarned = round2(earnBuckets * earnRatePts);
      if (pointsEarned > 0) {
        wallet.balance_points = round2(Number(wallet.balance_points) + pointsEarned);
        await wallet.save({ transaction });
        await LoyaltyTransaction.create(
          {
            customer_id: customer.id,
            type: 'EARN',
            points: pointsEarned,
            amount_lempiras: moneyPaid,
            payment_method: 'none',
            reference: null,
            related_sale_id: sale.id,
            related_layaway_id: null,
            created_by_user_id: actor.id,
            reason: 'Earn from sale',
          },
          { transaction }
        );
        await createAuditEvent({
          type: 'LOYALTY_EARN_FROM_SALE',
          actorUserId: actor.id,
          payload: { saleId: sale.id, customerId: customer.id, points_earned: pointsEarned, base_money: moneyPaid },
        });
      }
    }

    await createAuditEvent({
      type: 'SALE_CREATE',
      actorUserId: actor.id,
      payload: { saleId: sale.id, sale_number: sale.sale_number, total, customer_id: payload.customer_id ?? null },
    });

    return getSaleById(sale.id);
  });
}

async function voidSale(saleId, actor) {
  return sequelize.transaction(async (transaction) => {
    const sale = await Sale.findByPk(saleId, {
      include: [{ model: SaleItem, as: 'items' }, { model: SalePayment, as: 'payments' }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!sale) {
      const e = new Error('Sale not found');
      e.code = 'SALE_NOT_FOUND';
      throw e;
    }
    if (sale.status !== 'COMPLETED') {
      const e = new Error('Only COMPLETED sales can be voided');
      e.code = 'SALE_NOT_VOIDABLE';
      throw e;
    }

    for (const item of sale.items) {
      const variant = await ProductVariant.findByPk(item.product_variant_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (variant) {
        variant.stock = Number(variant.stock) + Number(item.quantity);
        await variant.save({ transaction });
        await createAuditEvent({
          type: 'STOCK_REVERT_FROM_VOID',
          actorUserId: actor.id,
          payload: { saleId: sale.id, variantId: variant.id, delta: Number(item.quantity) },
        });
      }
    }

    if (sale.customer_id) {
      const customer = await Customer.findByPk(sale.customer_id, {
        include: [{ model: LoyaltyWallet, as: 'wallet' }],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const wallet = customer?.wallet;
      if (wallet) {
        const relatedTxs = await LoyaltyTransaction.findAll({
          where: { related_sale_id: sale.id, type: { [Op.in]: ['EARN', 'REDEEM'] } },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        for (const tx of relatedTxs) {
          if (tx.type === 'EARN') {
            const earnPoints = Number(tx.points);
            if (Number(wallet.balance_points) < earnPoints) {
              const e = new Error('Cannot void sale: insufficient wallet balance to reverse earned points');
              e.code = 'LOYALTY_REVERSE_BLOCKED';
              throw e;
            }
            wallet.balance_points = round2(Number(wallet.balance_points) - earnPoints);
            await LoyaltyTransaction.create(
              {
                customer_id: customer.id,
                type: 'ADJUST',
                points: -earnPoints,
                amount_lempiras: tx.amount_lempiras,
                payment_method: 'none',
                reference: null,
                related_sale_id: sale.id,
                related_layaway_id: null,
                created_by_user_id: actor.id,
                reason: 'Reverse EARN due sale void',
              },
              { transaction }
            );
          }
          if (tx.type === 'REDEEM') {
            const redeemedPoints = Math.abs(Number(tx.points));
            wallet.balance_points = round2(Number(wallet.balance_points) + redeemedPoints);
            await LoyaltyTransaction.create(
              {
                customer_id: customer.id,
                type: 'ADJUST',
                points: redeemedPoints,
                amount_lempiras: tx.amount_lempiras,
                payment_method: 'none',
                reference: null,
                related_sale_id: sale.id,
                related_layaway_id: null,
                created_by_user_id: actor.id,
                reason: 'Return redeemed points due sale void',
              },
              { transaction }
            );
          }
        }
        await wallet.save({ transaction });
      }
    }

    sale.status = 'VOIDED';
    await sale.save({ transaction });

    await createAuditEvent({
      type: 'SALE_VOID',
      actorUserId: actor.id,
      payload: { saleId: sale.id, sale_number: sale.sale_number },
    });

    return getSaleById(sale.id);
  });
}

module.exports = { createSale, listSales, getSaleById, voidSale };
