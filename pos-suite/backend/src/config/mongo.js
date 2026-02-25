const mongoose = require('mongoose');

function validateMysqlEnvPresence() {
  const dbUser = (process.env.DB_USER || '').trim();
  const dbName = (process.env.DB_NAME || '').trim();
  if (!dbUser || !dbName) {
    throw new Error('Missing DB_USER/DB_NAME. Check backend/.env');
  }
}

async function connectMongo() {
  validateMysqlEnvPresence();
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(mongoUri);
  console.log('MongoDB connected');
}

module.exports = { connectMongo };
