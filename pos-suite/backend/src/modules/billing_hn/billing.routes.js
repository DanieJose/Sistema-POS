const express = require('express');

const { authJwt } = require('../../middlewares/authJwt');
const { requireRole } = require('../../middlewares/requireRole');
const { validateRequest } = require('../../middlewares/validateRequest');
const billingController = require('./billing.controller');
const {
  issueInvoiceValidations,
  bySaleParamValidation,
  invoiceIdParamValidation,
  createCreditNoteValidations,
} = require('./billing.validations');

const router = express.Router();

router.use(authJwt);

router.post(
  '/invoices',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...issueInvoiceValidations, validateRequest],
  billingController.issueInvoice
);

router.get(
  '/invoices/by-sale/:saleId',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...bySaleParamValidation, validateRequest],
  billingController.getInvoiceBySale
);

router.get(
  '/invoices/:id/pdf',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...invoiceIdParamValidation, validateRequest],
  billingController.downloadInvoicePdf
);

router.post(
  '/credit-notes',
  requireRole(['ADMIN', 'SUPERVISOR']),
  [...createCreditNoteValidations, validateRequest],
  billingController.createCreditNote
);

module.exports = router;
