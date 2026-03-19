const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const admin = require('../services/firebase');
const logger = require('../utils/logger');

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * @route   POST /api/auth/register
 * @desc    Register via email/password
 */
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      authProvider: 'email',
      avatarColor: generateAvatarColor(),
    });

    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Account created successfully! You received 30GB free storage and 10GB download data.',
      token,
      user: formatUser(user),
    });
  } catch (err) {
    logger.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login via email/password
 */
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: `Account banned: ${user.banReason || 'Violation of terms'}` });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    user.lastLoginAt = new Date();
    user.loginCount += 1;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: formatUser(user),
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * @route   POST /api/auth/google
 * @desc    Login/Register via Google Firebase
 */
const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Firebase ID token required' });

    let firebaseUser;
    try {
      firebaseUser = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid Firebase token' });
    }

    const { uid, name, email, picture } = firebaseUser;

    let user = await User.findOne({ $or: [{ uid }, { email }] });

    if (!user) {
      // New user
      user = await User.create({
        uid,
        name: name || email.split('@')[0],
        email,
        photoURL: picture || '',
        authProvider: 'google',
        isEmailVerified: true,
        avatarColor: generateAvatarColor(),
      });
    } else {
      // Existing user – update Firebase UID if missing
      if (!user.uid) user.uid = uid;
      if (!user.photoURL && picture) user.photoURL = picture;
      user.lastLoginAt = new Date();
      user.loginCount += 1;
      await user.save();
    }

    if (user.isBanned) {
      return res.status(403).json({ error: `Account banned: ${user.banReason || 'Violation of terms'}` });
    }

    const token = generateToken(user._id);

    res.json({
      message: user.loginCount === 1 ? 'Welcome to SDUCS! You received 30GB free storage.' : 'Login successful',
      token,
      user: formatUser(user),
      isNewUser: user.loginCount <= 1,
    });
  } catch (err) {
    logger.error('Google auth error:', err);
    res.status(500).json({ error: 'Google authentication failed' });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout (client-side token removal, but we can invalidate FCM token)
 */
const logout = async (req, res) => {
  try {
    const { deviceToken } = req.body;
    if (deviceToken) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { deviceTokens: deviceToken },
      });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Helpers
const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  photoURL: user.photoURL,
  role: user.role,
  authProvider: user.authProvider,
  isEmailVerified: user.isEmailVerified,
  theme: user.theme,
  avatarColor: user.avatarColor,
  storage: {
    totalBytes: user.storage.totalBytes,
    usedBytes: user.storage.usedBytes,
    availableBytes: user.storage.totalBytes - user.storage.usedBytes,
    maxBytes: user.storage.maxBytes,
    usedPercent: Math.round((user.storage.usedBytes / user.storage.totalBytes) * 100),
    dailyRewardEarned: user.storage.dailyRewardEarned,
    dailyRewardCap: user.storage.dailyRewardCap,
  },
  downloadData: {
    totalBytes: user.downloadData.totalBytes,
    usedBytes: user.downloadData.usedBytes,
    availableBytes: user.downloadData.totalBytes - user.downloadData.usedBytes,
  },
  subscription: user.subscription,
  ads: {
    dailyCount: user.ads.dailyCount,
    dailyLimit: user.ads.dailyLimit,
    totalAdsWatched: user.ads.totalAdsWatched,
  },
  createdAt: user.createdAt,
});

const generateAvatarColor = () => {
  const colors = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
  return colors[Math.floor(Math.random() * colors.length)];
};

module.exports = { register, login, googleAuth, getMe, logout };
