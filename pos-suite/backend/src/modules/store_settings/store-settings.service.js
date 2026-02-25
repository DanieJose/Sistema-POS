const { StoreSettings } = require('./store-settings.model');

const SINGLETON_ID = 1;
const DEFAULT_TOPUP_METHODS = '["cash","card","transfer"]';
const DEFAULT_STORE_HOURS = '{}';

function toJsonString(value, fallback) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'string') {
    JSON.parse(value);
    return value;
  }

  return JSON.stringify(value);
}

function normalizePayload(payload) {
  const next = { ...payload };

  if (Object.prototype.hasOwnProperty.call(next, 'loyalty_topup_allowed_methods')) {
    next.loyalty_topup_allowed_methods = toJsonString(
      next.loyalty_topup_allowed_methods,
      DEFAULT_TOPUP_METHODS
    );
  }

  if (Object.prototype.hasOwnProperty.call(next, 'store_hours')) {
    next.store_hours = toJsonString(next.store_hours, DEFAULT_STORE_HOURS);
  }

  return next;
}

function serialize(settingsInstance) {
  const row = settingsInstance.toJSON ? settingsInstance.toJSON() : settingsInstance;

  return {
    ...row,
    loyalty_topup_allowed_methods: row.loyalty_topup_allowed_methods
      ? JSON.parse(row.loyalty_topup_allowed_methods)
      : [],
    store_hours: row.store_hours ? JSON.parse(row.store_hours) : {},
  };
}

async function getOrCreateStoreSettings() {
  let settings = await StoreSettings.findByPk(SINGLETON_ID);

  if (!settings) {
    settings = await StoreSettings.create({ id: SINGLETON_ID });
  }

  return settings;
}

async function updateStoreSettings(payload) {
  const settings = await getOrCreateStoreSettings();
  const normalizedPayload = normalizePayload(payload);

  await settings.update(normalizedPayload);
  return settings;
}

module.exports = {
  getOrCreateStoreSettings,
  updateStoreSettings,
  serialize,
};
