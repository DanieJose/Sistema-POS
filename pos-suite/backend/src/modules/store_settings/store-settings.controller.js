const storeSettingsService = require('./store-settings.service');

async function getStoreSettings(req, res) {
  const settings = await storeSettingsService.getOrCreateStoreSettings();
  return res.json({ ok: true, data: storeSettingsService.serialize(settings) });
}

async function upsertStoreSettings(req, res) {
  const settings = await storeSettingsService.updateStoreSettings(req.body);
  return res.json({ ok: true, data: storeSettingsService.serialize(settings) });
}

module.exports = {
  getStoreSettings,
  upsertStoreSettings,
};
