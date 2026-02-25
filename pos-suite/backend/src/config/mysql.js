const { Sequelize } = require('sequelize');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_NAME = (process.env.DB_NAME || '').trim();
const DB_USER = (process.env.DB_USER || '').trim();
const DB_PASS = process.env.DB_PASS || '';

if (!DB_USER || !DB_NAME) {
  throw new Error('Missing DB_USER/DB_NAME. Check backend/.env');
}

const sequelize = new Sequelize(
  DB_NAME,
  DB_USER,
  DB_PASS,
  {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'mysql',
    logging: false,
  }
);

module.exports = { sequelize };
