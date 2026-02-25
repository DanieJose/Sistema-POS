const express = require('express');

const { authJwt } = require('../../middlewares/authJwt');
const { requireRole } = require('../../middlewares/requireRole');
const { validateRequest } = require('../../middlewares/validateRequest');
const loyaltyController = require('./loyalty.controller');
const {
  walletByCustomerValidations,
  listLoyaltyTransactionsValidations,
  topupValidations,
  adjustPointsValidations,
  redeemQuoteValidations,
  redeemCommitValidations,
} = require('./loyalty.validations');

const router = express.Router();

router.use(authJwt);

router.get(
  '/customers/:id/wallet',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...walletByCustomerValidations, validateRequest],
  loyaltyController.getWallet
);

router.get(
  '/customers/:id/loyalty-transactions',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...listLoyaltyTransactionsValidations, validateRequest],
  loyaltyController.listTransactions
);

router.post(
  '/customers/:id/topup',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...topupValidations, validateRequest],
  loyaltyController.topup
);

router.post(
  '/customers/:id/adjust-points',
  requireRole(['ADMIN', 'SUPERVISOR']),
  [...adjustPointsValidations, validateRequest],
  loyaltyController.adjustPoints
);

router.post(
  '/loyalty/redeem-quote',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...redeemQuoteValidations, validateRequest],
  loyaltyController.redeemQuote
);

router.post(
  '/loyalty/redeem-commit',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...redeemCommitValidations, validateRequest],
  loyaltyController.redeemCommit
);

module.exports = router;
