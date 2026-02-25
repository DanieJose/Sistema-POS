const { CashMovement } = require('./cash-movement.model');
const { CashSession } = require('./cash-session.model');

if (!CashSession.associations.movements) {
  CashSession.hasMany(CashMovement, {
    foreignKey: 'cash_session_id',
    as: 'movements',
    onDelete: 'CASCADE',
  });
}

if (!CashMovement.associations.session) {
  CashMovement.belongsTo(CashSession, {
    foreignKey: 'cash_session_id',
    as: 'session',
  });
}

module.exports = { CashSession, CashMovement };
