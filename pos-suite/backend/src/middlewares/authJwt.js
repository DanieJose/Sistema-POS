const jwt = require('jsonwebtoken');

const { Role, User } = require('../modules/users/models');

async function authJwt(req, res, next) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, message: 'Missing bearer token' });
  }

  const token = authHeader.slice(7).trim();
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return res.status(500).json({ ok: false, message: 'JWT_SECRET is not configured' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = await User.findOne({
      where: { id: payload.sub, is_active: true },
      include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
    });

    if (!user) {
      return res.status(401).json({ ok: false, message: 'Invalid token user' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      role: user.role ? user.role.name : null,
      is_active: user.is_active,
      created_at: user.created_at,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ ok: false, message: 'Invalid or expired token' });
  }
}

module.exports = { authJwt };
