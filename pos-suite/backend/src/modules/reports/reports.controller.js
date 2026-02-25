const reportsService = require('./reports.service');

async function financialSummary(req, res) {
  const data = await reportsService.getFinancialSummary(req.query, req.user.id);
  return res.json({ ok: true, data });
}

async function inventoryInvestment(req, res) {
  const data = await reportsService.getInventoryInvestment(req.user.id);
  return res.json({ ok: true, data });
}

async function byCategory(req, res) {
  const data = await reportsService.getByCategory(req.user.id);
  return res.json({ ok: true, data });
}

async function loyaltySummary(req, res) {
  const data = await reportsService.getLoyaltySummary(req.user.id);
  return res.json({ ok: true, data });
}

async function taxSummary(req, res) {
  const data = await reportsService.getTaxSummary(req.query, req.user.id);
  return res.json({ ok: true, data });
}

async function dashboard(req, res) {
  const data = await reportsService.getDashboard(req.user.id, req.user.role);
  return res.json({ ok: true, data });
}

module.exports = {
  financialSummary,
  inventoryInvestment,
  byCategory,
  loyaltySummary,
  taxSummary,
  dashboard,
};
