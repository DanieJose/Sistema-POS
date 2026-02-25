const { Customer } = require('../customers/customer.model');
const { LoyaltyTransaction } = require('./loyalty-transaction.model');
const { LoyaltyWallet } = require('./loyalty-wallet.model');

if (!Customer.associations.wallet) {
  Customer.hasOne(LoyaltyWallet, {
    foreignKey: 'customer_id',
    as: 'wallet',
    onDelete: 'CASCADE',
  });
}

if (!LoyaltyWallet.associations.customer) {
  LoyaltyWallet.belongsTo(Customer, {
    foreignKey: 'customer_id',
    as: 'customer',
  });
}

if (!Customer.associations.loyaltyTransactions) {
  Customer.hasMany(LoyaltyTransaction, {
    foreignKey: 'customer_id',
    as: 'loyalty_transactions',
    onDelete: 'CASCADE',
  });
}

if (!LoyaltyTransaction.associations.customer) {
  LoyaltyTransaction.belongsTo(Customer, {
    foreignKey: 'customer_id',
    as: 'customer',
  });
}

module.exports = { Customer, LoyaltyWallet, LoyaltyTransaction };
