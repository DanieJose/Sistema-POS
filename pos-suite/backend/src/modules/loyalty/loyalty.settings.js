const { getOrCreateStoreSettings } = require('../store_settings/store-settings.service');

function parseJsonArray(value, fallback) {
  try {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return JSON.parse(value);
  } catch {}
  return fallback;
}

async function getLoyaltyRules() {
  const settings = await getOrCreateStoreSettings();
  return {
    loyalty_point_value: Number(settings.loyalty_point_value || 1),
    loyalty_earn_rate_points: Number(settings.loyalty_earn_rate_points || 1),
    loyalty_earn_rate_lempiras: Number(settings.loyalty_earn_rate_lempiras || 10),
    loyalty_allow_pay_with_points: Boolean(settings.loyalty_allow_pay_with_points),
    loyalty_allow_mixed_payment: Boolean(settings.loyalty_allow_mixed_payment),
    loyalty_max_points_percent_per_sale: Number(settings.loyalty_max_points_percent_per_sale || 80),
    loyalty_min_redeem_amount: Number(settings.loyalty_min_redeem_amount || 10),
    loyalty_topup_min: Number(settings.loyalty_topup_min || 50),
    loyalty_topup_max: Number(settings.loyalty_topup_max || 5000),
    loyalty_topup_allowed_methods: parseJsonArray(settings.loyalty_topup_allowed_methods, [
      'cash',
      'card',
      'transfer',
    ]),
    loyalty_topup_earns_points: Boolean(settings.loyalty_topup_earns_points),
  };
}

module.exports = { getLoyaltyRules };
