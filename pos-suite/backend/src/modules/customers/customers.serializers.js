function serializeWallet(walletInstance) {
  if (!walletInstance) return null;
  const wallet = walletInstance.toJSON ? walletInstance.toJSON() : walletInstance;

  return {
    id: wallet.id,
    customer_id: wallet.customer_id,
    balance_points: wallet.balance_points,
    created_at: wallet.created_at,
    updated_at: wallet.updated_at,
  };
}

function serializeCustomer(customerInstance) {
  const customer = customerInstance.toJSON ? customerInstance.toJSON() : customerInstance;
  return {
    id: customer.id,
    full_name: customer.full_name,
    phone: customer.phone,
    email: customer.email,
    is_active: customer.is_active,
    created_at: customer.created_at,
    updated_at: customer.updated_at,
    wallet: customer.wallet ? serializeWallet(customer.wallet) : undefined,
  };
}

module.exports = { serializeCustomer, serializeWallet };
