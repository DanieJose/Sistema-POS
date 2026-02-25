const express = require('express');

const { authJwt } = require('../../middlewares/authJwt');
const { requireRole } = require('../../middlewares/requireRole');
const { validateRequest } = require('../../middlewares/validateRequest');
const goalsController = require('./goals.controller');
const { createGoalValidations, goalProgressValidations } = require('./goals.validations');

const router = express.Router();

router.use(authJwt);

router.post(
  '/',
  requireRole(['ADMIN', 'SUPERVISOR']),
  [...createGoalValidations, validateRequest],
  goalsController.createGoal
);
router.get('/', requireRole(['ADMIN', 'SUPERVISOR']), goalsController.listGoals);
router.get(
  '/progress',
  requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
  [...goalProgressValidations, validateRequest],
  goalsController.goalProgress
);

module.exports = router;
