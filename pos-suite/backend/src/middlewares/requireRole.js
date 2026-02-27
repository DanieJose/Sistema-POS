function requireRole(allowedRoles) {
  const normalizedRoles = allowedRoles.map((role) => String(role).toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized' });
    }

    if (!normalizedRoles.includes(String(req.user.role || '').toLowerCase())) {
      return res.status(403).json({ ok: false, code: 'AUTH_FORBIDDEN', message: 'Forbidden' });
    }

    return next();
  };
}

module.exports = { requireRole };
