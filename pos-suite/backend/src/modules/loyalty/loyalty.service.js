const { sequelize } = require('../../config/mysql');
const { createAuditEvent } = require('../audit/audit.service');
const { Customer, LoyaltyTransaction, LoyaltyWallet } = require('./models');
const { getLoyaltyRules } = require('./loyalty.settings');

function round2(value) {
  return Number(Number(value).toFixed(2));
}

async function getCustomerWithWallet(customerId, transaction) {
  return Customer.findByPk(customerId, {
    include: [{ model: LoyaltyWallet, as: 'wallet' }],
    transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
}

async function getWalletByCustomerId(customerId) {
  return LoyaltyWallet.findOne({ where: { customer_id: customerId } });
}

async function listTransactionsByCustomer(customerId, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const { rows, count } = await LoyaltyTransaction.findAndCountAll({
    where: { customer_id: customerId },
    order: [['id', 'DESC']],
    offset,
    limit,
  });

  return {
    rows,
    pagination: {
      page,
      limit,
      total: count,
      total_pages: Math.max(1, Math.ceil(count / limit)),
    },
  };
}

async function topupWallet(customerId, payload, actorUserId) {
  const rules = await getLoyaltyRules();
  const amount = round2(payload.amount_lempiras);

  if (amount < rules.loyalty_topup_min || amount > rules.loyalty_topup_max) {
    const error = new Error(
      `amount_lempiras must be between ${rules.loyalty_topup_min} and ${rules.loyalty_topup_max}`
    );
    error.code = 'TOPUP_RANGE';
    throw error;
  }

  if (!rules.loyalty_topup_allowed_methods.includes(payload.payment_method)) {
    const error = new Error('payment_method not allowed by store settings');
    error.code = 'TOPUP_METHOD_NOT_ALLOWED';
    throw error;
  }

  if (payload.payment_method === 'transfer' && !payload.reference) {
    const error = new Error('reference is required for transfer');
    error.code = 'TRANSFER_REFERENCE_REQUIRED';
    throw error;
  }

  const points = round2(amount / (rules.loyalty_point_value || 1));

  return sequelize.transaction(async (transaction) => {
    const customer = await getCustomerWithWallet(customerId, transaction);
    if (!customer || !customer.wallet) {
      const error = new Error('Customer or wallet not found');
      error.code = 'CUSTOMER_NOT_FOUND';
      throw error;
    }

    customer.wallet.balance_points = round2(Number(customer.wallet.balance_points) + points);
    await customer.wallet.save({ transaction });

    const tx = await LoyaltyTransaction.create(
      {
        customer_id: customer.id,
        type: 'TOPUP',
        points,
        amount_lempiras: amount,
        payment_method: payload.payment_method,
        reference: payload.reference ?? null,
        related_sale_id: null,
        related_layaway_id: null,
        created_by_user_id: actorUserId,
        reason: null,
      },
      { transaction }
    );

    await createAuditEvent({
      type: 'LOYALTY_TOPUP',
      actorUserId,
      payload: { customerId: customer.id, amount_lempiras: amount, points, payment_method: payload.payment_method },
    });

    return { wallet: customer.wallet, transaction: tx };
  });
}

async function adjustPoints(customerId, payload, actorUserId) {
  const delta = round2(payload.points_delta);

  return sequelize.transaction(async (transaction) => {
    const customer = await getCustomerWithWallet(customerId, transaction);
    if (!customer || !customer.wallet) {
      const error = new Error('Customer or wallet not found');
      error.code = 'CUSTOMER_NOT_FOUND';
      throw error;
    }

    const nextBalance = round2(Number(customer.wallet.balance_points) + delta);
    if (nextBalance < 0) {
      const error = new Error('balance cannot be negative');
      error.code = 'NEGATIVE_BALANCE';
      throw error;
    }

    customer.wallet.balance_points = nextBalance;
    await customer.wallet.save({ transaction });

    const tx = await LoyaltyTransaction.create(
      {
        customer_id: customer.id,
        type: 'ADJUST',
        points: delta,
        amount_lempiras: null,
        payment_method: 'none',
        reference: null,
        related_sale_id: null,
        related_layaway_id: null,
        created_by_user_id: actorUserId,
        reason: payload.reason,
      },
      { transaction }
    );

    await createAuditEvent({
      type: 'LOYALTY_ADJUST',
      actorUserId,
      payload: { customerId: customer.id, points_delta: delta, new_balance: nextBalance, reason: payload.reason },
    });

    return { wallet: customer.wallet, transaction: tx };
  });
}

async function redeemQuote(payload, actorUserId) {
  const rules = await getLoyaltyRules();
  const pointsToUse = round2(payload.points_to_use);
  const saleTotal = round2(payload.sale_total_lempiras);

  if (!rules.loyalty_allow_pay_with_points) {
    const error = new Error('Loyalty point payments are disabled');
    error.code = 'REDEEM_DISABLED';
    throw error;
  }

  const wallet = await getWalletByCustomerId(payload.customer_id);
  if (!wallet) {
    const error = new Error('Wallet not found');
    error.code = 'WALLET_NOT_FOUND';
    throw error;
  }

  if (pointsToUse > Number(wallet.balance_points)) {
    const error = new Error('Insufficient points balance');
    error.code = 'INSUFFICIENT_POINTS';
    throw error;
  }

  if (pointsToUse < rules.loyalty_min_redeem_amount) {
    const error = new Error(`Minimum redeem amount is ${rules.loyalty_min_redeem_amount} points`);
    error.code = 'MIN_REDEEM';
    throw error;
  }

  const lempirasDiscount = round2(pointsToUse * (rules.loyalty_point_value || 1));
  const maxDiscountAllowed = round2(saleTotal * (rules.loyalty_max_points_percent_per_sale / 100));

  if (lempirasDiscount > maxDiscountAllowed) {
    const error = new Error('Points exceed max percent allowed for sale');
    error.code = 'MAX_PERCENT_EXCEEDED';
    error.meta = { max_discount_lempiras: maxDiscountAllowed };
    throw error;
  }

  const remainingToPay = round2(saleTotal - lempirasDiscount);
  if (remainingToPay > 0 && !rules.loyalty_allow_mixed_payment) {
    const error = new Error('Mixed payment with points is disabled');
    error.code = 'MIXED_DISABLED';
    throw error;
  }

  const result = {
    customer_id: Number(payload.customer_id),
    points_approved: pointsToUse,
    lempiras_discount: lempirasDiscount,
    remaining_to_pay: remainingToPay,
  };

  await createAuditEvent({
    type: 'LOYALTY_REDEEM_QUOTE',
    actorUserId,
    payload: { ...result, sale_total_lempiras: saleTotal },
  });

  return result;
}

async function redeemCommit(payload, actorUserId) {
  const rules = await getLoyaltyRules();
  const pointsToUse = round2(payload.points_to_use);

  if (!rules.loyalty_allow_pay_with_points) {
    const error = new Error('Loyalty point payments are disabled');
    error.code = 'REDEEM_DISABLED';
    throw error;
  }

  if (pointsToUse < rules.loyalty_min_redeem_amount) {
    const error = new Error(`Minimum redeem amount is ${rules.loyalty_min_redeem_amount} points`);
    error.code = 'MIN_REDEEM';
    throw error;
  }

  return sequelize.transaction(async (transaction) => {
    const customer = await getCustomerWithWallet(payload.customer_id, transaction);
    if (!customer || !customer.wallet) {
      const error = new Error('Customer or wallet not found');
      error.code = 'CUSTOMER_NOT_FOUND';
      throw error;
    }

    const currentBalance = Number(customer.wallet.balance_points);
    if (pointsToUse > currentBalance) {
      const error = new Error('Insufficient points balance');
      error.code = 'INSUFFICIENT_POINTS';
      throw error;
    }

    customer.wallet.balance_points = round2(currentBalance - pointsToUse);
    await customer.wallet.save({ transaction });

    const tx = await LoyaltyTransaction.create(
      {
        customer_id: customer.id,
        type: 'REDEEM',
        points: round2(-pointsToUse),
        amount_lempiras: round2(pointsToUse * (rules.loyalty_point_value || 1)),
        payment_method: 'none',
        reference: null,
        related_sale_id: payload.related_sale_id ?? null,
        related_layaway_id: null,
        created_by_user_id: actorUserId,
        reason: 'POS redeem commit',
      },
      { transaction }
    );

    await createAuditEvent({
      type: 'LOYALTY_REDEEM_COMMIT',
      actorUserId,
      payload: {
        customerId: customer.id,
        points_to_use: pointsToUse,
        related_sale_id: payload.related_sale_id ?? null,
        new_balance: customer.wallet.balance_points,
      },
    });

    return { wallet: customer.wallet, transaction: tx };
  });
}

module.exports = {
  getWalletByCustomerId,
  listTransactionsByCustomer,
  topupWallet,
  adjustPoints,
  redeemQuote,
  redeemCommit,
};
