const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const TARGET_DB_NAME = 'pos_ventas_honduras';

function envOrDefault(name, fallback = '') {
  return (process.env[name] || fallback).toString();
}

async function dropAndCreateDatabase() {
  const host = envOrDefault('DB_HOST', 'localhost');
  const port = Number(envOrDefault('DB_PORT', '3306')) || 3306;
  const user = envOrDefault('DB_USER').trim();
  const password = envOrDefault('DB_PASS');

  if (!user) {
    throw new Error('DB_USER is empty');
  }

  console.log('Reset DB env:', {
    DB_HOST: host,
    DB_PORT: port,
    DB_USER: user,
    DB_NAME: (process.env.DB_NAME || '').trim() || '(empty)',
    TARGET_DB_NAME,
  });

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: false,
  });

  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${TARGET_DB_NAME}\`;`);
    console.log('DB dropped');

    await connection.query(
      `CREATE DATABASE \`${TARGET_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    console.log('DB created');
  } finally {
    await connection.end();
  }
}

async function seedRoles(Role) {
  for (const name of ['ADMIN', 'SUPERVISOR', 'CASHIER']) {
    await Role.findOrCreate({
      where: { name },
      defaults: { name },
    });
  }
  console.log('Roles seeded');
}

async function syncTablesAndSeedRoles() {
  // Import sequelize after DB exists.
  const { sequelize } = require('../config/mysql');

  // Register models/associations in stable order.
  const { Role } = require('../modules/users/role.model');
  require('../modules/users/user.model');
  require('../modules/users/models');

  require('../modules/store_settings/store-settings.model');
  require('../modules/products/models');
  require('../modules/loyalty/models');
  require('../modules/cash/models');
  require('../modules/layaway/models');
  require('../modules/sales/models');
  require('../modules/billing_hn/models');
  require('../modules/goals/goal.model');

  let fkChecksDisabled = false;
  try {
    await sequelize.authenticate();
    console.log('MySQL connection OK');

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    fkChecksDisabled = true;
    console.log('FK checks disabled');

    await sequelize.sync({ force: true });
    console.log('Tables synced');

    await seedRoles(Role);
  } finally {
    if (fkChecksDisabled) {
      try {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
        console.log('FK checks enabled');
      } catch (error) {
        console.error('Failed to enable FK checks', error);
      }
    }
    try {
      await sequelize.close();
      console.log('MySQL connection closed');
    } catch (error) {
      console.error('Failed to close MySQL connection', error);
    }
  }
}

async function main() {
  await dropAndCreateDatabase();
  await syncTablesAndSeedRoles();
}

main().catch((error) => {
  console.error('db:reset failed');
  console.error(error);
  process.exit(1);
});
