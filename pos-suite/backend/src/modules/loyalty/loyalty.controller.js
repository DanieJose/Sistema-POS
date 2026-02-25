const { serializeWallet } = require('../customers/customers.serializers');
const { serializeLoyaltyTransaction } = require('./loyalty.serializers');
const loyaltyService = require('./loyalty.service');

function handleKnownError(error, res) {
  if (!error?.code) return false;

  if (['CUSTOMER_NOT_FOUND', 'WALLET_NOT_FOUND'].includes(error.code)) {
    res.status(404).json({ ok: false, message: error.message });
    return true;
  }

  if (
    [
      'TOPUP_RANGE',
      'TOPUP_METHOD_NOT_ALLOWED',
      'TRANSFER_REFERENCE_REQUIRED',
      'NEGATIVE_BALANCE',
      'REDEEM_DISABLED',
      'INSUFFICIENT_POINTS',
      'MIN_REDEEM',
      'MAX_PERCENT_EXCEEDED',
      'MIXED_DISABLED',
    ].includes(error.code)
  ) {
    res.status(400).json({ ok: false, message: error.message, ...(error.meta || {}) });
    return true;
  }

  return false;
}

async function getWallet(req, res) {
  const wallet = await loyaltyService.getWalletByCustomerId(req.params.id);
  if (!wallet) return res.status(404).json({ ok: false, message: 'Wallet not found' });
  return res.json({ ok: true, data: serializeWallet(wallet) });
}

async function listTransactions(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const result = await loyaltyService.listTransactionsByCustomer(req.params.id, page, limit);
  return res.json({
    ok: true,
    data: result.rows.map(serializeLoyaltyTransaction),
    pagination: result.pagination,
  });
}

async function topup(req, res) {
  try {
    const result = await loyaltyService.topupWallet(req.params.id, req.body, req.user.id);
    return res.status(201).json({
      ok: true,
      wallet: serializeWallet(result.wallet),
      transaction: serializeLoyaltyTransaction(result.transaction),
    });
  } catch (error) {
    if (handleKnownError(error, res)) return;
    throw error;
  }
}

async function adjustPoints(req, res) {
  try {
    const result = await loyaltyService.adjustPoints(req.params.id, req.body, req.user.id);
    return res.json({
      ok: true,
      wallet: serializeWallet(result.wallet),
      transaction: serializeLoyaltyTransaction(result.transaction),
    });
  } catch (error) {
    if (handleKnownError(error, res)) return;
    throw error;
  }
}

async function redeemQuote(req, res) {
  try {
    const quote = await loyaltyService.redeemQuote(req.body, req.user.id);
    return res.json({ ok: true, data: quote });
  } catch (error) {
    if (handleKnownError(error, res)) return;
    throw error;
  }
}

async function redeemCommit(req, res) {
  try {
    const result = await loyaltyService.redeemCommit(req.body, req.user.id);
    return res.json({
      ok: true,
      wallet: serializeWallet(result.wallet),
      transaction: serializeLoyaltyTransaction(result.transaction),
    });
  } catch (error) {
    if (handleKnownError(error, res)) return;
    throw error;
  }
}

module.exports = {
  getWallet,
  listTransactions,
  topup,
  adjustPoints,
  redeemQuote,
  redeemCommit,
};
