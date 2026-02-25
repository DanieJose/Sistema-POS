function serializeGoal(goalInstance) {
  const goal = goalInstance.toJSON ? goalInstance.toJSON() : goalInstance;
  return {
    id: goal.id,
    type: goal.type,
    target_amount: goal.target_amount,
    start_date: goal.start_date,
    end_date: goal.end_date,
    created_at: goal.created_at,
  };
}

module.exports = { serializeGoal };
