const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { sequelize } = require('../config/mysql');

// Register base models in order (Role -> User), then associations/other modules.
const { Role } = require('../modules/users/role.model');
require('../modules/users/user.model');
require('../modules/users/models'); // executes Role<->User associations

require('../modules/store_settings/store-settings.model');
require('../modules/products/models');
require('../modules/loyalty/models'); // includes Customer + loyalty associations
require('../modules/cash/models');
require('../modules/layaway/models');
require('../modules/sales/models');
require('../modules/billing_hn/models');
require('../modules/goals/goal.model');

async function seedRoles() {
  const roleNames = ['ADMIN', 'SUPERVISOR', 'CASHIER'];
  for (const name of roleNames) {
    await Role.findOrCreate({
      where: { name },
      defaults: { name },
    });
  }
  console.log('Role seed completed');
}

async function main() {
  const useForce = process.argv.includes('--force');
  let fkChecksDisabled = false;
  console.log('DB sync env:', {
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: process.env.DB_PORT || '3306',
    DB_USER: (process.env.DB_USER || '').trim() || '(empty)',
    DB_NAME: (process.env.DB_NAME || '').trim() || '(empty)',
  });
  console.log('DB sync mode:', useForce ? 'force=true (DROP/RECREATE TABLES)' : 'alter=true');

  if (useForce) {
    console.warn('WARNING: --force will DROP and recreate tables (development only).');
  }

  await sequelize.authenticate();
  console.log('MySQL connection OK');

  try {
    if (useForce) {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
      fkChecksDisabled = true;
      console.log('FK checks disabled');
    }

    await sequelize.sync(useForce ? { force: true } : { alter: true });
    console.log('DB sync completed');

    await seedRoles();
  } finally {
    if (fkChecksDisabled) {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
      console.log('FK checks enabled');
    }
  }
}

main()
  .catch((error) => {
    console.error('db:sync failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
      console.log('MySQL connection closed');
    } catch (error) {
      console.error('Failed to close MySQL connection', error);
    }
  });
