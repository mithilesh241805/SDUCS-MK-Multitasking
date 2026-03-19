const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { register, login, googleAuth, getMe, logout } = require('../controllers/authController');
const { protect, createActionLimiter } = require('../middleware/auth');

const loginLimiter = createActionLimiter(10, 15); // 10 attempts per 15 min

// @route POST /api/auth/register
router.post('/register',
  loginLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  register
);

// @route POST /api/auth/login
router.post('/login', loginLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  login
);

// @route POST /api/auth/google
router.post('/google', loginLimiter, googleAuth);

// @route GET /api/auth/me
router.get('/me', protect, getMe);

// @route POST /api/auth/logout
router.post('/logout', protect, logout);

module.exports = router;
