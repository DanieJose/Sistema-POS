const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const { startAutomationScheduler } = require('./modules/automation/automation.service');
const { sequelize } = require('./config/mysql');
const { connectMongo } = require('./config/mongo');
const { seedUsersModule } = require('./modules/users/seed');

const PORT = process.env.PORT || 3000;
const SHOULD_SYNC = String(process.env.DB_SYNC || 'false').toLowerCase() === 'true';

console.log('MySQL env loaded:', {
  DB_USER: (process.env.DB_USER || '').trim() || '(empty)',
  DB_NAME: (process.env.DB_NAME || '').trim() || '(empty)',
});

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('MySQL connected');

    if (SHOULD_SYNC) {
      await sequelize.sync();
      console.log('Sequelize sync completed');
    }

    try {
      await seedUsersModule();
    } catch (seedError) {
      console.warn(`Seed skipped: ${seedError.message}`);
    }

    await connectMongo();
    startAutomationScheduler();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
