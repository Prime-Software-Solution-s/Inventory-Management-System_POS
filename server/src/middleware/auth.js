const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('./asyncHandler');

const AUTH_USER_SELECT = '_id name email role createdAt updatedAt lastLoginAt lastActiveAt';

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('Authentication required.');
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select(AUTH_USER_SELECT).lean();

  if (!user) {
    res.status(401);
    throw new Error('User not found.');
  }

  const now = new Date();
  const shouldRefreshActivity =
    !user.lastActiveAt || now - new Date(user.lastActiveAt) > 1000 * 60 * 5;

  if (shouldRefreshActivity) {
    User.updateOne({ _id: user._id }, { $set: { lastActiveAt: now } }).catch(() => undefined);
    user.lastActiveAt = now;
  }

  req.user = user;
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403);
    throw new Error('You do not have permission to perform this action.');
  }

  next();
};

module.exports = {
  protect,
  authorize,
};
