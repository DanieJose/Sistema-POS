const express = require('express');

const { authJwt } = require('../../middlewares/authJwt');
const { requireRole } = require('../../middlewares/requireRole');
const automationController = require('./automation.controller');

const router = express.Router();

router.use(authJwt);
router.post('/run/low-stock', requireRole(['ADMIN']), automationController.runLowStock);
router.post('/run/layaway', requireRole(['ADMIN']), automationController.runLayaway);
router.post('/run/cai', requireRole(['ADMIN']), automationController.runCai);

module.exports = router;
