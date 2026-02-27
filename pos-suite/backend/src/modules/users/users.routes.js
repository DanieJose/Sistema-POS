const express = require('express');
const bcrypt = require('bcrypt');
const { body, param } = require('express-validator');

const { authJwt } = require('../../middlewares/authJwt');
const { requireRole } = require('../../middlewares/requireRole');
const { validateRequest } = require('../../middlewares/validateRequest');
const { Role, User } = require('./models');

const router = express.Router();

function serializeUser(userInstance) {
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

const userInclude = [{ model: Role, as: 'role', attributes: ['id', 'name'] }];

router.use(authJwt, requireRole(['admin']));

router.get('/', async (req, res) => {
  const users = await User.findAll({
    include: userInclude,
    order: [['id', 'ASC']],
  });

  res.json({ ok: true, data: users.map(serializeUser) });
});

router.get(
  '/:id',
  [param('id').isInt({ min: 1 }), validateRequest],
  async (req, res) => {
    const user = await User.findByPk(req.params.id, { include: userInclude });

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    return res.json({ ok: true, data: serializeUser(user) });
  }
);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('name is required'),
    body('email').isEmail().withMessage('email must be valid').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('password must be at least 8 characters'),
    body('role_id').isInt({ min: 1 }).withMessage('role_id must be a valid integer'),
    body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
    validateRequest,
  ],
  async (req, res) => {
    const { name, email, password, role_id, is_active } = req.body;

    const role = await Role.findByPk(role_id);
    if (!role) {
      return res.status(400).json({ ok: false, message: 'Invalid role_id' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ ok: false, message: 'Email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password_hash,
      role_id,
      is_active: typeof is_active === 'boolean' ? is_active : true,
    });

    const createdUser = await User.findByPk(user.id, { include: userInclude });
    return res.status(201).json({ ok: true, data: serializeUser(createdUser) });
  }
);

router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }),
    body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
    body('email').optional().isEmail().withMessage('email must be valid').normalizeEmail(),
    body('password')
      .optional()
      .isLength({ min: 8 })
      .withMessage('password must be at least 8 characters'),
    body('role_id').optional().isInt({ min: 1 }).withMessage('role_id must be a valid integer'),
    body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
    validateRequest,
  ],
  async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const { name, email, password, role_id, is_active } = req.body;

    if (role_id !== undefined) {
      const role = await Role.findByPk(role_id);
      if (!role) {
        return res.status(400).json({ ok: false, message: 'Invalid role_id' });
      }
      user.role_id = role_id;
    }

    if (email !== undefined && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser && existingUser.id !== user.id) {
        return res.status(409).json({ ok: false, message: 'Email already exists' });
      }
      user.email = email;
    }

    if (name !== undefined) {
      user.name = name;
    }

    if (typeof is_active === 'boolean') {
      user.is_active = is_active;
    }

    if (password) {
      user.password_hash = await bcrypt.hash(password, 10);
    }

    await user.save();

    const updatedUser = await User.findByPk(user.id, { include: userInclude });
    return res.json({ ok: true, data: serializeUser(updatedUser) });
  }
);

router.delete(
  '/:id',
  [param('id').isInt({ min: 1 }), validateRequest],
  async (req, res) => {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    await user.destroy();
    return res.json({ ok: true });
  }
);

module.exports = router;
