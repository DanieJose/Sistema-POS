const { Op } = require('sequelize');
const { sequelize } = require('../../config/mysql');
const { createAuditEvent } = require('../audit/audit.service');
const { Customer, LoyaltyWallet } = require('../loyalty/models');

async function createCustomer(payload, actorUserId) {
  return sequelize.transaction(async (transaction) => {
    const customer = await Customer.create(
      {
        full_name: payload.full_name,
        phone: payload.phone,
        email: payload.email ?? null,
        is_active: typeof payload.is_active === 'boolean' ? payload.is_active : true,
      },
      { transaction }
    );

    const wallet = await LoyaltyWallet.create(
      {
        customer_id: customer.id,
        balance_points: 0,
      },
      { transaction }
    );

    await createAuditEvent({
      type: 'CUSTOMER_CREATE',
      actorUserId,
      payload: { customerId: customer.id, phone: customer.phone },
    });

    customer.setDataValue('wallet', wallet);
    return customer;
  });
}

async function listCustomers(filters) {
  const where = {};
  if (filters.phone) where.phone = { [Op.like]: `%${filters.phone}%` };
  if (filters.name) where.full_name = { [Op.like]: `%${filters.name}%` };

  return Customer.findAll({
    where,
    include: [{ model: LoyaltyWallet, as: 'wallet' }],
    order: [['id', 'DESC']],
  });
}

async function getCustomerById(id) {
  return Customer.findByPk(id, { include: [{ model: LoyaltyWallet, as: 'wallet' }] });
}

async function updateCustomer(id, payload, actorUserId) {
  const customer = await Customer.findByPk(id, { include: [{ model: LoyaltyWallet, as: 'wallet' }] });
  if (!customer) return null;

  for (const field of ['full_name', 'phone', 'email', 'is_active']) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      customer[field] = payload[field];
    }
  }
  await customer.save();

  await createAuditEvent({
    type: 'CUSTOMER_UPDATE',
    actorUserId,
    payload: { customerId: customer.id, changes: payload },
  });

  return customer;
}

async function softDeleteCustomer(id, actorUserId) {
  const customer = await Customer.findByPk(id, { include: [{ model: LoyaltyWallet, as: 'wallet' }] });
  if (!customer) return null;

  customer.is_active = false;
  await customer.save();

  await createAuditEvent({
    type: 'CUSTOMER_DELETE',
    actorUserId,
    payload: { customerId: customer.id },
  });

  return customer;
}

module.exports = {
  createCustomer,
  listCustomers,
  getCustomerById,
  updateCustomer,
  softDeleteCustomer,
};
