const goalsService = require('./goals.service');
const { serializeGoal } = require('./goals.serializers');

async function createGoal(req, res) {
  const goal = await goalsService.createGoal(req.body, req.user.id);
  return res.status(201).json({ ok: true, data: serializeGoal(goal) });
}

async function listGoals(req, res) {
  const goals = await goalsService.listGoals();
  return res.json({ ok: true, data: goals.map(serializeGoal) });
}

async function goalProgress(req, res) {
  const result = await goalsService.getGoalProgress(req.query.goal_id);
  if (!result) return res.status(404).json({ ok: false, message: 'Goal not found' });
  return res.json({
    ok: true,
    data: {
      goal_id: result.goal.id,
      target: result.target,
      current_sales: result.current_sales,
      percentage_achieved: result.percentage_achieved,
      remaining: result.remaining,
    },
  });
}

module.exports = { createGoal, listGoals, goalProgress };
