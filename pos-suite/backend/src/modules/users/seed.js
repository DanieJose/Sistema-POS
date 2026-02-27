const bcrypt = require('bcrypt');

const { Role, User } = require('./models');

const DEFAULT_ROLES = ['admin', 'cajero', 'supervisor'];

async function seedRoles() {
  for (const roleName of DEFAULT_ROLES) {
    await Role.findOrCreate({
      where: { name: roleName },
      defaults: { name: roleName },
    });
  }
}

async function seedDevAdmin() {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const adminRole = await Role.findOne({ where: { name: 'admin' } });
  if (!adminRole) {
    throw new Error('admin role not found during seed');
  }

  const existingAdmin = await User.findOne({
    where: { email: 'admin@pos.local' },
  });

  if (existingAdmin) {
    return;
  }

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  await User.create({
    name: 'System Admin',
    email: 'admin@pos.local',
    password_hash: passwordHash,
    role_id: adminRole.id,
    is_active: true,
  });

  console.log('Dev admin user seeded: admin@pos.local');
}

async function seedUsersModule() {
  await seedRoles();
  await seedDevAdmin();
}

module.exports = { seedUsersModule };
