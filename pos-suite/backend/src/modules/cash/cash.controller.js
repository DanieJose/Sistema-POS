const cashService = require('./cash.service');
const { serializeCashMovement, serializeCashSession } = require('./cash.serializers');

function handleCashError(error, res) {
  if (!error?.code) return false;
  if (['CASH_ALREADY_OPEN', 'CASH_NOT_OPEN'].includes(error.code)) {
    res.status(400).json({ ok: false, message: error.message });
    return true;
  }
  return false;
}

async function openCash(req, res) {
  try {
    const session = await cashService.openCashSession(req.body, req.user.id);
    return res.status(201).json({ ok: true, data: serializeCashSession(session) });
  } catch (error) {
    if (handleCashError(error, res)) return;
    throw error;
  }
}

async function getCurrentCash(req, res) {
  const session = await cashService.getOpenCashSession();
  return res.json({ ok: true, data: session ? serializeCashSession(session) : null });
}

async function createMovement(req, res) {
  try {
    const movement = await cashService.createCashMovement(req.body, req.user.id);
    return res.status(201).json({ ok: true, data: serializeCashMovement(movement) });
  } catch (error) {
    if (handleCashError(error, res)) return;
    throw error;
  }
}

async function closeCash(req, res) {
  try {
    const session = await cashService.closeCashSession(req.body, req.user.id);
    return res.json({ ok: true, data: serializeCashSession(session) });
  } catch (error) {
    if (handleCashError(error, res)) return;
    throw error;
  }
}

module.exports = { openCash, getCurrentCash, createMovement, closeCash };
