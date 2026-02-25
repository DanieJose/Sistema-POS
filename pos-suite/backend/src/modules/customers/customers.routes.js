const express = require('express');

const { authJwt } = require('../../middlewares/authJwt');
const { requireRole } = require('../../middlewares/requireRole');
const { validateRequest } = require('../../middlewares/validateRequest');
const customersController = require('./customers.controller');
const {
  customerIdParamValidation,
  createCustomerValidations,
  listCustomersValidations,
  updateCustomerValidations,
} = require('./customers.validations');

const router = express.Router();

router.use(authJwt);

router.post(
  '/',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...createCustomerValidations, validateRequest],
  customersController.createCustomer
);

router.get(
  '/',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...listCustomersValidations, validateRequest],
  customersController.listCustomers
);

router.get(
  '/:id',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...customerIdParamValidation, validateRequest],
  customersController.getCustomerById
);

router.put(
  '/:id',
  requireRole(['ADMIN', 'SUPERVISOR']),
  [...updateCustomerValidations, validateRequest],
  customersController.updateCustomer
);

router.delete(
  '/:id',
  requireRole(['ADMIN']),
  [...customerIdParamValidation, validateRequest],
  customersController.deleteCustomer
);

module.exports = router;
