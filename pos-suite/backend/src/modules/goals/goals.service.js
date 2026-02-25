const { createAuditEvent } = require('../audit/audit.service');
const { Goal } = require('./goal.model');
const reportsService = require('../reports/reports.service');

async function createGoal(payload, actorUserId) {
  const goal = await Goal.create({
    type: payload.type,
    target_amount: payload.target_amount,
    start_date: payload.start_date,
    end_date: payload.end_date,
  });

  await createAuditEvent({
    type: 'GOAL_CREATE',
    actorUserId,
    payload: { goalId: goal.id, type: goal.type, target_amount: goal.target_amount },
  });

  return goal;
}

async function listGoals() {
  return Goal.findAll({ order: [['id', 'DESC']] });
}

async function getGoalProgress(goalId) {
  return reportsService.getGoalProgressById(goalId);
}

module.exports = { createGoal, listGoals, getGoalProgress };
