const customersService = require('./customers.service');
const { serializeCustomer } = require('./customers.serializers');

function mapUniqueError(error) {
  if (error?.name !== 'SequelizeUniqueConstraintError') return null;
  const field = error.errors?.[0]?.path || 'field';
  return `${field} already exists`;
}

async function createCustomer(req, res) {
  try {
    const customer = await customersService.createCustomer(req.body, req.user.id);
    return res.status(201).json({ ok: true, data: serializeCustomer(customer) });
  } catch (error) {
    const message = mapUniqueError(error);
    if (message) return res.status(409).json({ ok: false, message });
    throw error;
  }
}

async function listCustomers(req, res) {
  const rows = await customersService.listCustomers({ phone: req.query.phone, name: req.query.name });
  return res.json({ ok: true, data: rows.map(serializeCustomer) });
}

async function getCustomerById(req, res) {
  const customer = await customersService.getCustomerById(req.params.id);
  if (!customer) return res.status(404).json({ ok: false, message: 'Customer not found' });
  return res.json({ ok: true, data: serializeCustomer(customer) });
}

async function updateCustomer(req, res) {
  try {
    const customer = await customersService.updateCustomer(req.params.id, req.body, req.user.id);
    if (!customer) return res.status(404).json({ ok: false, message: 'Customer not found' });
    return res.json({ ok: true, data: serializeCustomer(customer) });
  } catch (error) {
    const message = mapUniqueError(error);
    if (message) return res.status(409).json({ ok: false, message });
    throw error;
  }
}

async function deleteCustomer(req, res) {
  const customer = await customersService.softDeleteCustomer(req.params.id, req.user.id);
  if (!customer) return res.status(404).json({ ok: false, message: 'Customer not found' });
  return res.json({ ok: true, data: serializeCustomer(customer) });
}

module.exports = {
  createCustomer,
  listCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};
