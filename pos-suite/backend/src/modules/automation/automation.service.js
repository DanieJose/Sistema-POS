const cron = require('node-cron');
const { createAuditEvent } = require('../audit/audit.service');
const { InvoiceSequence } = require('../billing_hn/models');
const { runExpirationJob } = require('../layaway/layaway.service');
const { Layaway } = require('../layaway/models');
const { ProductVariant } = require('../products/models');
const { getOrCreateStoreSettings } = require('../store_settings/store-settings.service');
const notificationsService = require('../notifications/notifications.service');

const SYSTEM_ACTOR_USER_ID = 0;

function roundDaysDiff(fromDate, toDate) {
  const ms = toDate.getTime() - fromDate.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

async function logJobRun(name, result) {
  await createAuditEvent({
    type: 'JOB_RUN',
    actorUserId: SYSTEM_ACTOR_USER_ID,
    payload: { name, result },
  });
}

async function runLowStockJob(actorUserId = SYSTEM_ACTOR_USER_ID) {
  const settings = await getOrCreateStoreSettings();
  const threshold = Number(settings.low_stock_threshold || 3);
  const variants = await ProductVariant.findAll({
    where: { is_active: true, stock: { [require('sequelize').Op.lte]: threshold } },
    order: [['stock', 'ASC']],
  });

  let createdCount = 0;
  for (const v of variants) {
    const res = await notificationsService.createNotificationIfNotRecent(
      {
        type: 'LOW_STOCK',
        severity: Number(v.stock) <= 0 ? 'critical' : 'warning',
        title: 'Stock bajo',
        message: `La variante ${v.sku} tiene stock ${v.stock} (umbral ${threshold}).`,
        entity: { kind: 'variant', id: v.id },
        meta: { sku: v.sku, stock: v.stock, threshold },
      },
      24,
      actorUserId
    );
    if (res.created) createdCount += 1;
  }

  const result = { checked: variants.length, created_notifications: createdCount, threshold };
  await logJobRun('low-stock', result);
  return result;
}

async function runProductExpiresSoonJob(actorUserId = SYSTEM_ACTOR_USER_ID) {
  const now = new Date();
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);

  const variants = await ProductVariant.findAll({
    where: {
      stock: { [require('sequelize').Op.gt]: 0 },
      expires_at: {
        [require('sequelize').Op.ne]: null,
        [require('sequelize').Op.lte]: in30,
      },
    },
    order: [['expires_at', 'ASC']],
  });

  let createdCount = 0;
  for (const v of variants) {
    const days = roundDaysDiff(now, new Date(v.expires_at));
    const res = await notificationsService.createNotificationIfNotRecent(
      {
        type: 'PRODUCT_EXPIRES_SOON',
        severity: days <= 7 ? 'critical' : 'warning',
        title: 'Producto por vencer',
        message: `La variante ${v.sku} vence en ${days} día(s).`,
        entity: { kind: 'variant', id: v.id },
        meta: { sku: v.sku, expires_at: v.expires_at, stock: v.stock, days_remaining: days },
      },
      24,
      actorUserId
    );
    if (res.created) createdCount += 1;
  }

  const result = { checked: variants.length, created_notifications: createdCount };
  await logJobRun('product-expires-soon', result);
  return result;
}

async function runLayawayAlertsJob(actorUserId = SYSTEM_ACTOR_USER_ID) {
  const today = new Date();
  const dueSoonDate = new Date();
  dueSoonDate.setDate(dueSoonDate.getDate() + 2);
  dueSoonDate.setHours(23, 59, 59, 999);

  const activeLayaways = await Layaway.findAll({ where: { status: 'ACTIVE' } });
  let dueSoonCreated = 0;

  for (const l of activeLayaways) {
    const due = new Date(l.due_date);
    if (due > today && due <= dueSoonDate) {
      const res = await notificationsService.createNotificationIfNotRecent(
        {
          type: 'LAYAWAY_DUE_SOON',
          severity: 'warning',
          title: 'Apartado por vencer',
          message: `El apartado #${l.id} vence el ${due.toISOString().slice(0, 10)}.`,
          entity: { kind: 'layaway', id: l.id },
          meta: { due_date: l.due_date, remaining_amount: l.remaining_amount },
        },
        24,
        actorUserId
      );
      if (res.created) dueSoonCreated += 1;
    }
  }

  const expirationResult = await runExpirationJob(actorUserId);
  let expiredCreated = 0;
  for (const layawayId of expirationResult.expiredIds) {
    const res = await notificationsService.createNotificationIfNotRecent(
      {
        type: 'LAYAWAY_EXPIRED',
        severity: 'critical',
        title: 'Apartado vencido',
        message: `El apartado #${layawayId} fue vencido automáticamente.`,
        entity: { kind: 'layaway', id: layawayId },
        meta: { layaway_id: layawayId },
      },
      24,
      actorUserId
    );
    if (res.created) expiredCreated += 1;
  }

  const result = {
    active_checked: activeLayaways.length,
    due_soon_notifications: dueSoonCreated,
    expired_count: expirationResult.count,
    expired_notifications: expiredCreated,
  };
  await logJobRun('layaway', result);
  return result;
}

function parseCorrelativeNumber(str) {
  const m = String(str || '').match(/(\d+)$/);
  return m ? Number(m[1]) : null;
}

async function runCaiChecksJob(actorUserId = SYSTEM_ACTOR_USER_ID) {
  const settings = await getOrCreateStoreSettings();
  const result = {
    cai_expires_notification: false,
    cai_range_notification: false,
    remaining: null,
  };

  if (settings.cai_expires_at) {
    const today = new Date();
    const in15 = new Date();
    in15.setDate(in15.getDate() + 15);
    const exp = new Date(settings.cai_expires_at);
    if (exp <= in15) {
      const res = await notificationsService.createNotificationIfNotRecent(
        {
          type: 'CAI_EXPIRES_SOON',
          severity: exp < today ? 'critical' : 'warning',
          title: 'CAI por vencer',
          message: `El CAI vence el ${exp.toISOString().slice(0, 10)}.`,
          entity: { kind: 'settings', id: 1 },
          meta: { cai_expires_at: settings.cai_expires_at, cai: settings.cai || null },
        },
        24,
        actorUserId
      );
      result.cai_expires_notification = res.created;
    }
  }

  const toN = parseCorrelativeNumber(settings.range_to);
  if (toN !== null) {
    const seq = await InvoiceSequence.findByPk(1);
    const currentInt = seq ? Number(seq.current_int) : parseCorrelativeNumber(settings.range_from) - 1;
    const remaining = Math.max(0, toN - currentInt);
    result.remaining = remaining;
    if (remaining <= 20) {
      const res = await notificationsService.createNotificationIfNotRecent(
        {
          type: 'CAI_RANGE_LOW',
          severity: remaining <= 5 ? 'critical' : 'warning',
          title: 'Rango CAI agotándose',
          message: `Quedan ${remaining} facturas disponibles en el rango CAI.`,
          entity: { kind: 'settings', id: 1 },
          meta: { remaining, range_to: settings.range_to, current_int: currentInt },
        },
        24,
        actorUserId
      );
      result.cai_range_notification = res.created;
    }
  }

  await logJobRun('cai', result);
  return result;
}

async function runHourlyJobs(actorUserId = SYSTEM_ACTOR_USER_ID) {
  const [lowStock, productExpires] = await Promise.all([
    runLowStockJob(actorUserId),
    runProductExpiresSoonJob(actorUserId),
  ]);
  const result = { lowStock, productExpires };
  await logJobRun('hourly-bundle', result);
  return result;
}

async function runDailyMorningJobs(actorUserId = SYSTEM_ACTOR_USER_ID) {
  const [layaway, cai] = await Promise.all([runLayawayAlertsJob(actorUserId), runCaiChecksJob(actorUserId)]);
  const result = { layaway, cai };
  await logJobRun('daily-morning-bundle', result);
  return result;
}

let schedulerStarted = false;
function startAutomationScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  cron.schedule('0 * * * *', async () => {
    try {
      await runHourlyJobs();
    } catch (error) {
      console.error('Hourly automation job failed:', error.message);
    }
  });

  cron.schedule('0 8 * * *', async () => {
    try {
      await runDailyMorningJobs();
    } catch (error) {
      console.error('Daily automation job failed:', error.message);
    }
  });
}

module.exports = {
  runLowStockJob,
  runProductExpiresSoonJob,
  runLayawayAlertsJob,
  runCaiChecksJob,
  runHourlyJobs,
  runDailyMorningJobs,
  startAutomationScheduler,
};
