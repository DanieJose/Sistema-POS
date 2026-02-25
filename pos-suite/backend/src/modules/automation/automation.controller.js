const automationService = require('./automation.service');

async function runLowStock(req, res) {
  const data = await automationService.runLowStockJob(req.user.id);
  return res.json({ ok: true, data });
}

async function runLayaway(req, res) {
  const data = await automationService.runLayawayAlertsJob(req.user.id);
  return res.json({ ok: true, data });
}

async function runCai(req, res) {
  const data = await automationService.runCaiChecksJob(req.user.id);
  return res.json({ ok: true, data });
}

module.exports = { runLowStock, runLayaway, runCai };
