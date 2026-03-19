const jwt = require('jsonwebtoken');
const admin = require('../services/firebase');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Verify JWT token (for email/password auth)
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authorized, no token' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    // Try JWT first
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user || !user.isActive || user.isBanned) {
        return res.status(401).json({ error: 'User account suspended or not found' });
      }
      req.user = user;
      return next();
    } catch (jwtErr) {
      // Try Firebase token
      try {
        const firebaseDecoded = await admin.auth().verifyIdToken(token);
        const user = await User.findOne({ uid: firebaseDecoded.uid });
        if (!user || !user.isActive || user.isBanned) {
          return res.status(401).json({ error: 'User account suspended or not found' });
        }
        req.user = user;
        return next();
      } catch (firebaseErr) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }
  } catch (err) {
    logger.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Admin only middleware
 */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Verify admin secret (for admin API calls)
 */
const adminSecret = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Invalid admin secret' });
  }
  next();
};

/**
 * Rate limit specific actions
 */
const createActionLimiter = (max, windowMinutes) => {
  const rateLimit = require('express-rate-limit');
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    message: { error: `Too many requests, try again in ${windowMinutes} minutes` },
  });
};

module.exports = { protect, adminOnly, adminSecret, createActionLimiter };
