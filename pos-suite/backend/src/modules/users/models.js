const { Role } = require('./role.model');
const { User } = require('./user.model');

if (!User.associations.role) {
  User.belongsTo(Role, {
    foreignKey: 'role_id',
    as: 'role',
  });
}

if (!Role.associations.users) {
  Role.hasMany(User, {
    foreignKey: 'role_id',
    as: 'users',
  });
}

module.exports = { Role, User };
