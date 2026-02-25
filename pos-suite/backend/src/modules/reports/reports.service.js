const { Op } = require('sequelize');
const { createAuditEvent } = require('../audit/audit.service');
const { Invoice } = require('../billing_hn/models');
const { Goal } = require('../goals/goal.model');
const { Layaway } = require('../layaway/models');
const { LoyaltyTransaction, LoyaltyWallet } = require('../loyalty/models');
const { Product, ProductVariant } = require('../products/models');
const { getOrCreateStoreSettings } = require('../store_settings/store-settings.service');
const { Sale, SaleItem } = require('../sales/models');

function round2(v) {
  return Number(Number(v || 0).toFixed(2));
}

function parseDateRange(dateFrom, dateTo, field = 'created_at') {
  const where = {};
  if (dateFrom || dateTo) {
    where[field] = {};
    if (dateFrom) where[field][Op.gte] = new Date(dateFrom);
    if (dateTo) where[field][Op.lte] = new Date(dateTo);
  }
  return where;
}

async function auditReportView(actorUserId, name, filters) {
  await createAuditEvent({
    type: 'REPORT_VIEW',
    actorUserId,
    payload: { report: name, filters: filters || {} },
  });
}

async function getFinancialSummary(filters, actorUserId) {
  const where = { status: 'COMPLETED', ...parseDateRange(filters.date_from, filters.date_to) };
  const sales = await Sale.findAll({ where });

  const total_sales = sales.length;
  const total_discounts = round2(sales.reduce((a, s) => a + Number(s.discount_total), 0));
  const total_surcharges = round2(sales.reduce((a, s) => a + Number(s.surcharge_total), 0));
  const total_tax = round2(sales.reduce((a, s) => a + Number(s.tax_total), 0));
  const total_revenue = round2(sales.reduce((a, s) => a + (Number(s.total) - Number(s.tax_total)), 0));
  const total_cost = round2(sales.reduce((a, s) => a + Number(s.cost_total), 0));
  const gross_profit = round2(sales.reduce((a, s) => a + Number(s.profit_gross), 0));
  const total_opex = 0;
  const net_profit = round2(gross_profit - total_opex);

  await auditReportView(actorUserId, 'financial-summary', filters);
  return {
    total_sales,
    total_discounts,
    total_surcharges,
    total_tax,
    total_revenue,
    total_cost,
    gross_profit,
    total_opex,
    net_profit,
  };
}

async function getInventoryInvestment(actorUserId) {
  const variants = await ProductVariant.findAll({
    where: { is_active: true },
    include: [{ model: Product, as: 'product', required: false }],
  });

  const total_inventory_value = round2(
    variants.reduce((a, v) => a + Number(v.stock) * Number(v.cost), 0)
  );
  const total_expected_revenue = round2(
    variants.reduce((a, v) => a + Number(v.stock) * Number(v.price), 0)
  );
  const expected_profit = round2(total_expected_revenue - total_inventory_value);
  const ROI_percentage =
    total_inventory_value > 0 ? round2((expected_profit / total_inventory_value) * 100) : 0;

  await auditReportView(actorUserId, 'inventory-investment');
  return { total_inventory_value, total_expected_revenue, expected_profit, ROI_percentage };
}

async function getByCategory(actorUserId) {
  const rows = await SaleItem.findAll({
    include: [
      {
        model: Sale,
        as: 'sale',
        where: { status: 'COMPLETED' },
        required: true,
      },
      {
        model: ProductVariant,
        as: 'variant',
        include: [{ model: Product, as: 'product', attributes: ['category'] }],
        required: true,
      },
    ],
  });

  const map = new Map();
  for (const row of rows) {
    const category = row.variant?.product?.category || 'sin_categoria';
    const netLine = Number(row.line_subtotal) - Number(row.line_discount || 0);
    const costLine = Number(row.unit_cost) * Number(row.quantity);
    const profit = netLine - costLine;
    const current = map.get(category) || { category, total_sales: 0, total_profit: 0 };
    current.total_sales = round2(current.total_sales + netLine);
    current.total_profit = round2(current.total_profit + profit);
    map.set(category, current);
  }

  await auditReportView(actorUserId, 'by-category');
  return Array.from(map.values());
}

async function getLoyaltySummary(actorUserId) {
  const txs = await LoyaltyTransaction.findAll();
  const wallets = await LoyaltyWallet.findAll();

  const total_points_earned = round2(
    txs.filter((t) => t.type === 'EARN').reduce((a, t) => a + Number(t.points), 0)
  );
  const total_points_redeemed = round2(
    txs
      .filter((t) => t.type === 'REDEEM')
      .reduce((a, t) => a + Math.abs(Number(t.points)), 0)
  );
  const total_points_topup = round2(
    txs.filter((t) => t.type === 'TOPUP').reduce((a, t) => a + Number(t.points), 0)
  );
  const total_wallet_balance = round2(wallets.reduce((a, w) => a + Number(w.balance_points), 0));

  await auditReportView(actorUserId, 'loyalty-summary');
  return { total_points_earned, total_points_redeemed, total_points_topup, total_wallet_balance };
}

async function getTaxSummary(filters, actorUserId) {
  const where = { status: 'ISSUED', ...parseDateRange(filters.date_from, filters.date_to, 'issued_at') };
  const invoices = await Invoice.findAll({ where, order: [['invoice_number', 'ASC']] });
  const lastIssuedGlobal = await Invoice.findOne({
    where: { status: 'ISSUED' },
    order: [['invoice_number', 'DESC']],
  });
  const total_tax_collected = round2(invoices.reduce((a, i) => a + Number(i.tax_total), 0));
  const total_invoices = invoices.length;

  const settings = await getOrCreateStoreSettings();
  let range_used = null;
  let remaining_invoices_in_cai = null;
  if (settings.range_from && settings.range_to) {
    const m1 = String(settings.range_from).match(/^(.*?)(\d+)$/);
    const m2 = String(settings.range_to).match(/^(.*?)(\d+)$/);
    if (m1 && m2) {
      const fromN = Number(m1[2]);
      const toN = Number(m2[2]);
      const lastInv = invoices[invoices.length - 1];
      const usedUntil = lastIssuedGlobal
        ? Number(String(lastIssuedGlobal.invoice_number).match(/(\d+)$/)?.[1] || fromN - 1)
        : fromN - 1;
      range_used = {
        from: settings.range_from,
        to: lastIssuedGlobal ? lastIssuedGlobal.invoice_number : null,
        used_count: Math.max(0, usedUntil - fromN + 1),
      };
      remaining_invoices_in_cai = Math.max(0, toN - usedUntil);
    }
  }

  await auditReportView(actorUserId, 'tax-summary', filters);
  return { total_tax_collected, total_invoices, range_used, remaining_invoices_in_cai };
}

async function getGoalProgressById(goalId) {
  const goal = await Goal.findByPk(goalId);
  if (!goal) return null;

  const current_sales = round2(
    (
      await Sale.findAll({
        where: {
          status: 'COMPLETED',
          created_at: {
            [Op.gte]: new Date(`${goal.start_date}T00:00:00.000Z`),
            [Op.lte]: new Date(`${goal.end_date}T23:59:59.999Z`),
          },
        },
      })
    ).reduce((a, s) => a + Number(s.total), 0)
  );

  const target = Number(goal.target_amount);
  const percentage_achieved = target > 0 ? round2((current_sales / target) * 100) : 0;
  const remaining = round2(Math.max(0, target - current_sales));

  return { goal, target, current_sales, percentage_achieved, remaining };
}

async function getDashboard(actorUserId, actorRole) {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const salesToday = await Sale.findAll({
    where: { status: 'COMPLETED', created_at: { [Op.gte]: start, [Op.lte]: end } },
  });

  const ventas_hoy = round2(salesToday.reduce((a, s) => a + Number(s.total), 0));
  const ganancia_hoy = round2(salesToday.reduce((a, s) => a + Number(s.profit_gross), 0));

  const in2Days = new Date();
  in2Days.setDate(in2Days.getDate() + 2);
  const apartados_por_vencer = await Layaway.count({
    where: { status: 'ACTIVE', due_date: { [Op.gte]: today, [Op.lte]: in2Days } },
  });

  const settings = await getOrCreateStoreSettings();
  const lowStockThreshold = Number(settings.low_stock_threshold || 5);
  const stock_bajo = await ProductVariant.findAll({
    where: { is_active: true, stock: { [Op.lte]: lowStockThreshold } },
    attributes: ['id', 'product_id', 'sku', 'stock'],
    limit: 50,
    order: [['stock', 'ASC']],
  });

  const todayDate = today.toISOString().slice(0, 10);
  const activeGoal = await Goal.findOne({
    where: {
      start_date: { [Op.lte]: todayDate },
      end_date: { [Op.gte]: todayDate },
    },
    order: [['id', 'DESC']],
  });

  let meta_actual_progreso = null;
  if (activeGoal && actorRole !== 'CASHIER') {
    const p = await getGoalProgressById(activeGoal.id);
    meta_actual_progreso = p
      ? {
          goal_id: p.goal.id,
          type: p.goal.type,
          target: p.target,
          current_sales: p.current_sales,
          percentage_achieved: p.percentage_achieved,
          remaining: p.remaining,
        }
      : null;
  }

  await auditReportView(actorUserId, 'dashboard');
  return {
    ventas_hoy,
    ganancia_hoy: actorRole === 'CASHIER' ? null : ganancia_hoy,
    apartados_por_vencer,
    stock_bajo,
    meta_actual_progreso,
  };
}

module.exports = {
  getFinancialSummary,
  getInventoryInvestment,
  getByCategory,
  getLoyaltySummary,
  getTaxSummary,
  getDashboard,
  getGoalProgressById,
};
