const crypto = require('crypto');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const Sale = require('../models/Sale');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const {
  FINALIZED_SALE_STATUSES,
  cleanupExpiredHeldSales,
} = require('../services/saleWorkflowService');
const {
  ensureBootstrapAdmin,
  getBootstrapAdminConfig,
} = require('../services/bootstrapAdmin');
const createToken = require('../utils/createToken');

const STAFF_ACCOUNT_SELECT = 'name email role createdAt updatedAt lastLoginAt lastActiveAt';
const LOGIN_SELECT = `${STAFF_ACCOUNT_SELECT} +password`;

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  lastLoginAt: user.lastLoginAt,
  lastActiveAt: user.lastActiveAt,
});

const createStaffAccount = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email, and password are required.');
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() }).select('_id').lean();

  if (existingUser) {
    res.status(409);
    throw new Error('An account with this email already exists.');
  }

  const user = await User.create({
    name,
    email,
    password,
    role: 'staff',
  });

  res.status(201).json({
    user: sanitizeUser(user),
  });
});

const listStaffAccounts = asyncHandler(async (_req, res) => {
  const staffAccounts = await User.find({ role: 'staff' })
    .select(STAFF_ACCOUNT_SELECT)
    .sort({ lastActiveAt: -1, lastLoginAt: -1, createdAt: -1 })
    .lean();

  res.json({
    items: staffAccounts.map((user) => sanitizeUser(user)),
  });
});

const getStaffAccountDetails = asyncHandler(async (req, res) => {
  await cleanupExpiredHeldSales();
  const staffUser = await User.findOne({
    _id: req.params.id,
    role: 'staff',
  })
    .select(STAFF_ACCOUNT_SELECT)
    .lean();

  if (!staffUser) {
    res.status(404);
    throw new Error('Staff account not found.');
  }

  const productFilter = {
    $or: [
      { createdBy: staffUser._id },
      { updatedBy: staffUser._id },
      { lastStockAdjustedBy: staffUser._id },
    ],
  };

  const [productStats, salesStats, purchaseOrderStats, recentProducts, recentSales, recentOrders] =
    await Promise.all([
      Product.aggregate([
        { $match: productFilter },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            lowStockCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ['$quantity', 0] },
                      { $lte: ['$quantity', '$lowStockThreshold'] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            outOfStockCount: {
              $sum: {
                $cond: [{ $lte: ['$quantity', 0] }, 1, 0],
              },
            },
            inventoryValue: {
              $sum: { $multiply: ['$quantity', '$purchasePrice'] },
            },
          },
        },
      ]),
      Sale.aggregate([
        {
          $match: {
            createdBy: staffUser._id,
            status: { $in: FINALIZED_SALE_STATUSES },
          },
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: 1 },
            totalSalesValue: { $sum: '$totalPrice' },
          },
        },
      ]),
      PurchaseOrder.aggregate([
        {
          $match: {
            $or: [{ createdBy: staffUser._id }, { lastStatusUpdatedBy: staffUser._id }],
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            receivedOrders: {
              $sum: {
                $cond: [{ $eq: ['$status', 'received'] }, 1, 0],
              },
            },
            totalOrderValue: { $sum: '$totalAmount' },
          },
        },
      ]),
      Product.find(productFilter)
        .sort({ updatedAt: -1 })
        .limit(4)
        .select(
          'name sku quantity lowStockThreshold createdAt updatedAt createdBy updatedBy lastStockAdjustedBy'
        )
        .lean(),
      Sale.find({
        createdBy: staffUser._id,
        status: { $in: FINALIZED_SALE_STATUSES },
      })
        .sort({ createdAt: -1 })
        .limit(4)
        .select('customerName totalPrice createdAt status')
        .lean(),
      PurchaseOrder.find({
        $or: [{ createdBy: staffUser._id }, { lastStatusUpdatedBy: staffUser._id }],
      })
        .sort({ updatedAt: -1 })
        .limit(4)
        .select('status totalAmount createdAt updatedAt')
        .lean(),
    ]);

  const productSummary = productStats[0] || {};
  const salesSummary = salesStats[0] || {};
  const purchaseOrderSummary = purchaseOrderStats[0] || {};
  const staffId = String(staffUser._id);

  const activity = [
    ...recentProducts.map((product) => {
      let title = 'Product updated';
      let description = `${product.name} inventory record was updated.`;

      if (product.lastStockAdjustedBy && String(product.lastStockAdjustedBy) === staffId) {
        title = 'Stock adjusted';
        description = `${product.name} stock changed to ${product.quantity}.`;
      } else if (product.createdBy && String(product.createdBy) === staffId) {
        title = 'Product created';
        description = `${product.name} was added under SKU ${product.sku}.`;
      }

      return {
        type: 'product',
        title,
        description,
        createdAt: product.updatedAt || product.createdAt,
      };
    }),
    ...recentSales.map((sale) => ({
      type: 'sale',
      title: 'Sale completed',
      description: `${sale.customerName || 'Walk-in Customer'} order closed for $${Number(
        sale.totalPrice || 0
      ).toLocaleString('en-US')}.`,
      createdAt: sale.createdAt,
    })),
    ...recentOrders.map((order) => ({
      type: 'purchase-order',
      title: 'Purchase order handled',
      description: `Order marked ${order.status} with value $${Number(
        order.totalAmount || 0
      ).toLocaleString('en-US')}.`,
      createdAt: order.updatedAt || order.createdAt,
    })),
  ]
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, 8);

  res.json({
    staff: sanitizeUser(staffUser),
    summary: {
      productsManaged: productSummary.totalProducts || 0,
      lowStockCount: productSummary.lowStockCount || 0,
      outOfStockCount: productSummary.outOfStockCount || 0,
      inventoryValue: productSummary.inventoryValue || 0,
      salesCount: salesSummary.totalSales || 0,
      salesValue: salesSummary.totalSalesValue || 0,
      purchaseOrdersCount: purchaseOrderSummary.totalOrders || 0,
      receivedOrdersCount: purchaseOrderSummary.receivedOrders || 0,
      purchaseOrderValue: purchaseOrderSummary.totalOrderValue || 0,
    },
    activity,
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body || {};
  const identity = (email || username || '').trim();

  if (!identity) {
    res.status(400);
    throw new Error('Email or username is required.');
  }

  if (!password) {
    res.status(400);
    throw new Error('Password is required.');
  }

  const normalizedEmail = identity.toLowerCase();
  const bootstrapAdmin = getBootstrapAdminConfig();

  if (
    bootstrapAdmin.enabled &&
    normalizedEmail === bootstrapAdmin.email.toLowerCase() &&
    password === bootstrapAdmin.password
  ) {
    await ensureBootstrapAdmin({
      syncPassword: true,
    });
  }

  const user = await User.findOne({ email: normalizedEmail }).select(LOGIN_SELECT);

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password.');
  }

  const now = new Date();
  user.lastLoginAt = now;
  user.lastActiveAt = now;

  User.updateOne(
    { _id: user._id },
    {
      $set: {
        lastLoginAt: now,
        lastActiveAt: now,
      },
    }
  ).catch(() => undefined);

  res.json({
    token: createToken(user._id),
    user: sanitizeUser(user),
  });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    return res.json({
      message: 'If an account exists, a reset link has been generated.',
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpires = Date.now() + 1000 * 60 * 30;
  await user.save({ validateBeforeSave: false });

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

  res.json({
    message: 'Password reset instructions generated.',
    resetToken: process.env.NODE_ENV === 'production' ? undefined : resetToken,
    resetUrl: process.env.NODE_ENV === 'production' ? undefined : resetUrl,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Reset token is invalid or expired.');
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({
    message: 'Password reset successfully.',
    token: createToken(user._id),
    user: sanitizeUser(user),
  });
});

module.exports = {
  createStaffAccount,
  getStaffAccountDetails,
  listStaffAccounts,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword,
};
