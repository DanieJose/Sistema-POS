const layawayService = require('./layaway.service');
const { serializeLayaway } = require('./layaway.serializers');

async function createLayaway(req, res) {
  try {
    const layaway = await layawayService.createLayaway(req.body, req.user.id);
    return res.status(201).json({ ok: true, data: serializeLayaway(layaway) });
  } catch (error) {
    if (error.code === 'VARIANT_NOT_FOUND') {
      return res.status(404).json({ ok: false, message: error.message });
    }
    if (error.code === 'INSUFFICIENT_STOCK') {
      return res.status(400).json({ ok: false, message: error.message });
    }
    if (error.code === 'MIN_DOWN_PAYMENT') {
      return res.status(400).json({
        ok: false,
        message: error.message,
        min_down_payment: error.meta ? error.meta.minDownPayment : undefined,
      });
    }
    if (error.code === 'NEGATIVE_REMAINING') {
      return res.status(400).json({ ok: false, message: error.message });
    }
    throw error;
  }
}

async function listLayaways(req, res) {
  const layaways = await layawayService.listLayaways({ status: req.query.status });
  return res.json({ ok: true, data: layaways.map(serializeLayaway) });
}

async function getLayawayById(req, res) {
  const layaway = await layawayService.getLayawayById(req.params.id);
  if (!layaway) {
    return res.status(404).json({ ok: false, message: 'Layaway not found' });
  }
  return res.json({ ok: true, data: serializeLayaway(layaway) });
}

async function createPayment(req, res) {
  try {
    const layaway = await layawayService.addLayawayPayment(req.params.id, req.body, req.user.id);
    return res.json({ ok: true, data: serializeLayaway(layaway) });
  } catch (error) {
    if (['LAYAWAY_NOT_FOUND'].includes(error.code)) {
      return res.status(404).json({ ok: false, message: error.message });
    }
    if (['LAYAWAY_NOT_ACTIVE', 'NEGATIVE_REMAINING'].includes(error.code)) {
      return res.status(400).json({ ok: false, message: error.message });
    }
    throw error;
  }
}

async function cancelLayaway(req, res) {
  try {
    const layaway = await layawayService.cancelLayaway(req.params.id, req.user.id);
    return res.json({ ok: true, data: serializeLayaway(layaway) });
  } catch (error) {
    if (error.code === 'LAYAWAY_NOT_FOUND') {
      return res.status(404).json({ ok: false, message: error.message });
    }
    if (error.code === 'INVALID_STATUS') {
      return res.status(400).json({ ok: false, message: error.message });
    }
    throw error;
  }
}

async function runExpirationJob(req, res) {
  const result = await layawayService.runExpirationJob(req.user.id);
  return res.json({ ok: true, data: result });
}

module.exports = {
  createLayaway,
  listLayaways,
  getLayawayById,
  createPayment,
  cancelLayaway,
  runExpirationJob,
};
