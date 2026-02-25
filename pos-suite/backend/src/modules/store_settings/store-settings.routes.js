const express = require('express');

const { authJwt } = require('../../middlewares/authJwt');
const { requireRole } = require('../../middlewares/requireRole');
const { validateRequest } = require('../../middlewares/validateRequest');
const storeSettingsController = require('./store-settings.controller');
const { updateStoreSettingsValidations } = require('./store-settings.validations');

const router = express.Router();
router.get('/', authJwt, storeSettingsController.getStoreSettings);

router.put(
  '/',
  authJwt,
  requireRole(['ADMIN']),
  [...updateStoreSettingsValidations, validateRequest],
  storeSettingsController.upsertStoreSettings
);

module.exports = router;
