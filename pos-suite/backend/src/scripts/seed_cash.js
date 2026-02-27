const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { sequelize } = require('../config/mysql');
require('../modules/cash/models');
const { CashSession } = require('../modules/cash/models');

async function main() {
  await sequelize.authenticate();

  const count = await CashSession.count();
  if (count > 0) {
    console.log('cash seed skipped: sessions already exist');
    return;
  }

  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  await CashSession.create({
    opened_by_user_id: 1,
    opening_cash_amount: 500,
    opened_at: twoHoursAgo,
    closed_by_user_id: 1,
    closed_at: now,
    closing_cash_counted: 500,
    status: 'CLOSED',
    notes: 'seed',
  });

  console.log('cash seed completed');
}

main()
  .catch((error) => {
    console.error('seed:cash failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
