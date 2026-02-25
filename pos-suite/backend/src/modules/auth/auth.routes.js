const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');

const { authJwt } = require('../../middlewares/authJwt');
const { validateRequest } = require('../../middlewares/validateRequest');
const { Role, User } = require('../users/models');

const router = express.Router();

function serializeCurrentUser(userInstance) {
  const user = userInstance.toJSON ? userInstance.toJSON() : userInstance;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role_id: user.role_id,
    role: user.role ? user.role.name : undefined,
    is_active: user.is_active,
    created_at: user.created_at,
  };
}

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('email must be valid').normalizeEmail(),
    body('password').notEmpty().withMessage('password is required'),
    validateRequest,
  ],
  async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email, is_active: true },
      include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
    });

    if (!user) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ ok: false, message: 'JWT_SECRET is not configured' });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role ? user.role.name : null,
      },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      }
    );

    return res.json({
      ok: true,
      token,
      user: serializeCurrentUser(user),
    });
  }
);

router.get('/me', authJwt, async (req, res) => {
  return res.json({ ok: true, user: req.user });
});

module.exports = router;
