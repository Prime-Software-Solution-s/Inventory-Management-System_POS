const Category = require('../models/Category');
const DashboardSnapshot = require('../models/DashboardSnapshot');
const Notification = require('../models/Notification');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Supplier = require('../models/Supplier');
const asyncHandler = require('../middleware/asyncHandler');
const { getLowStockExpression, getOutOfStockExpression } = require('../constants/inventory');
const {
  FINALIZED_SALE_STATUSES,
  cleanupExpiredHeldSales,
} = require('../services/saleWorkflowService');

const LIVE_SNAPSHOT_REUSE_MS = 10000;

const formatMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const parseMonthValue = (value) => {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, 1);

  if (Number.isNaN(parsed.getTime()) || parsed.getMonth() !== month - 1) {
    return null;
  }

  return parsed;
};

const parseDateValue = (value) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const getMonthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const getMonthEndExclusive = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 1);
const getNextDayExclusive = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
const addMonths = (date, months) => new Date(date.getFullYear(), date.getMonth() + months, 1);

const formatMonthLabel = (date) =>
  date.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

const formatDateLabel = (date) =>
  date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const buildInventoryStats = async () => {
  const [
    totalProducts,
    lowStockItems,
    outOfStock,
    totalCategories,
    totalSuppliers,
    inventoryValue,
  ] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({
      $expr: getLowStockExpression(),
    }),
    Product.countDocuments({ $expr: getOutOfStockExpression() }),
    Category.countDocuments(),
    Supplier.countDocuments(),
    Product.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$quantity', '$purchasePrice'] } },
        },
      },
    ]),
  ]);

  return {
    totalProducts,
    lowStockItems,
    outOfStock,
    totalCategories,
    totalSuppliers,
    inventoryValue: inventoryValue[0]?.total || 0,
  };
};

const getSalesTotal = async (periodStart, periodEnd) => {
  const result = await Sale.aggregate([
    {
      $match: {
        createdAt: { $gte: periodStart, $lt: periodEnd },
        status: { $in: FINALIZED_SALE_STATUSES },
      },
    },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } },
  ]);

  return result[0]?.total || 0;
};

const getRecentActivity = async (periodStart, periodEnd) =>
  Notification.find({
    createdAt: { $gte: periodStart, $lt: periodEnd },
  })
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

const getTopProducts = async (periodStart, periodEnd) =>
  Sale.aggregate([
    {
      $match: {
        createdAt: { $gte: periodStart, $lt: periodEnd },
        status: { $in: FINALIZED_SALE_STATUSES },
      },
    },
    { $unwind: '$products' },
    {
      $group: {
        _id: '$products.product',
        name: { $first: '$products.name' },
        sold: { $sum: '$products.quantity' },
        revenue: { $sum: '$products.subtotal' },
      },
    },
    { $sort: { sold: -1 } },
    { $limit: 5 },
  ]);

const getMonthlySalesRows = async (periodStart, periodEnd) =>
  Sale.aggregate([
    {
      $match: {
        createdAt: { $gte: periodStart, $lt: periodEnd },
        status: { $in: FINALIZED_SALE_STATUSES },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        sales: { $sum: '$totalPrice' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

const buildFixedMonthChart = async (targetMonthDate) => {
  const chartStart = addMonths(getMonthStart(targetMonthDate), -5);
  const chartEnd = getMonthEndExclusive(targetMonthDate);
  const monthlySales = await getMonthlySalesRows(chartStart, chartEnd);
  const salesByMonth = new Map(
    monthlySales.map((item) => [
      `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      item,
    ])
  );

  return Array.from({ length: 6 }, (_, index) => {
    const date = addMonths(chartStart, index);
    const key = formatMonthKey(date);
    const item = salesByMonth.get(key);

    return {
      label: date.toLocaleString('en-US', { month: 'short' }),
      sales: item?.sales || 0,
      orders: item?.orders || 0,
    };
  });
};

const buildCustomRangeChart = async (periodStart, periodEnd) => {
  const chartStart = getMonthStart(periodStart);
  const chartEndMonth = getMonthStart(periodEnd);
  const monthlySales = await getMonthlySalesRows(chartStart, periodEnd);
  const salesByMonth = new Map(
    monthlySales.map((item) => [
      `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      item,
    ])
  );
  const monthCount =
    (chartEndMonth.getFullYear() - chartStart.getFullYear()) * 12 +
    (chartEndMonth.getMonth() - chartStart.getMonth()) +
    1;

  return Array.from({ length: monthCount }, (_, index) => {
    const date = addMonths(chartStart, index);
    const key = formatMonthKey(date);
    const item = salesByMonth.get(key);

    return {
      label: date.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
      sales: item?.sales || 0,
      orders: item?.orders || 0,
    };
  });
};

const buildDashboardPayload = async ({
  periodStart,
  periodEnd,
  chartBuilder,
}) => {
  const [inventoryStats, salesTotal, recentActivity, chart, topProducts] = await Promise.all([
    buildInventoryStats(),
    getSalesTotal(periodStart, periodEnd),
    getRecentActivity(periodStart, periodEnd),
    chartBuilder(),
    getTopProducts(periodStart, periodEnd),
  ]);

  return {
    stats: {
      ...inventoryStats,
      monthlySales: salesTotal,
    },
    charts: {
      monthlySales: chart,
      topProducts,
    },
    activity: recentActivity,
  };
};

const saveMonthSnapshot = async ({ monthDate, payload, source }) =>
  DashboardSnapshot.findOneAndUpdate(
    { monthKey: formatMonthKey(monthDate) },
    {
      monthKey: formatMonthKey(monthDate),
      periodStart: getMonthStart(monthDate),
      periodEnd: getMonthEndExclusive(monthDate),
      stats: payload.stats,
      charts: payload.charts,
      activity: payload.activity,
      snapshotSource: source,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

const getSnapshotResponse = (snapshot) => ({
  stats: snapshot.stats,
  charts: snapshot.charts,
  activity: snapshot.activity,
  meta: {
    mode: 'month',
    month: snapshot.monthKey,
    scopeLabel: `Saved snapshot • ${formatMonthLabel(snapshot.periodStart)}`,
    snapshotSource: snapshot.snapshotSource,
    snapshotUpdatedAt: snapshot.updatedAt,
    isCurrentPeriod: false,
  },
});

const getCurrentSnapshotResponse = (snapshot) => ({
  stats: snapshot.stats,
  charts: snapshot.charts,
  activity: snapshot.activity,
  meta: {
    mode: 'month',
    month: snapshot.monthKey,
    scopeLabel: `Live month • ${formatMonthLabel(snapshot.periodStart)}`,
    snapshotSource: 'live',
    snapshotUpdatedAt: snapshot.updatedAt,
    isCurrentPeriod: true,
  },
});

const refreshLiveSnapshotInBackground = ({ requestedMonth }) => {
  buildDashboardPayload({
    periodStart: getMonthStart(requestedMonth),
    periodEnd: getMonthEndExclusive(requestedMonth),
    chartBuilder: () => buildFixedMonthChart(requestedMonth),
  })
    .then((payload) =>
      saveMonthSnapshot({
        monthDate: requestedMonth,
        payload,
        source: 'live',
      })
    )
    .catch(() => undefined);
};

const getDashboard = asyncHandler(async (req, res) => {
  await cleanupExpiredHeldSales();
  const mode = req.query.mode === 'custom' ? 'custom' : 'month';
  const now = new Date();
  const currentMonthDate = getMonthStart(now);

  if (mode === 'custom') {
    const startDate = parseDateValue(req.query.startDate);
    const endDate = parseDateValue(req.query.endDate);

    if (!startDate || !endDate) {
      res.status(400);
      throw new Error('Valid startDate and endDate are required for a custom range.');
    }

    if (endDate < startDate) {
      res.status(400);
      throw new Error('endDate must be greater than or equal to startDate.');
    }

    const periodEnd = getNextDayExclusive(endDate);
    const payload = await buildDashboardPayload({
      periodStart: startDate,
      periodEnd,
      chartBuilder: () => buildCustomRangeChart(startDate, periodEnd),
    });

    res.json({
      ...payload,
      meta: {
        mode: 'custom',
        scopeLabel: `Custom range • ${formatDateLabel(startDate)} to ${formatDateLabel(endDate)}`,
        snapshotSource: 'live',
        startDate,
        endDate,
        isCurrentPeriod: false,
      },
    });
    return;
  }

  const requestedMonth = parseMonthValue(req.query.month) || currentMonthDate;

  if (requestedMonth > currentMonthDate) {
    res.status(400);
    throw new Error('Future months are not supported in dashboard filters.');
  }

  const isCurrentMonth = formatMonthKey(requestedMonth) === formatMonthKey(currentMonthDate);

  if (!isCurrentMonth) {
    const existingSnapshot = await DashboardSnapshot.findOne({
      monthKey: formatMonthKey(requestedMonth),
    }).lean();

    if (existingSnapshot) {
      res.json(getSnapshotResponse(existingSnapshot));
      return;
    }

    const backfilledPayload = await buildDashboardPayload({
      periodStart: getMonthStart(requestedMonth),
      periodEnd: getMonthEndExclusive(requestedMonth),
      chartBuilder: () => buildFixedMonthChart(requestedMonth),
    });
    const savedSnapshot = await saveMonthSnapshot({
      monthDate: requestedMonth,
      payload: backfilledPayload,
      source: 'backfill',
    });

    res.json(getSnapshotResponse(savedSnapshot));
    return;
  }

  const currentSnapshot = await DashboardSnapshot.findOne({
    monthKey: formatMonthKey(requestedMonth),
  }).lean();

  if (currentSnapshot) {
    const snapshotAgeMs = Date.now() - new Date(currentSnapshot.updatedAt).getTime();

    if (snapshotAgeMs > LIVE_SNAPSHOT_REUSE_MS) {
      refreshLiveSnapshotInBackground({ requestedMonth });
    }

    res.json(getCurrentSnapshotResponse(currentSnapshot));
    return;
  }

  const livePayload = await buildDashboardPayload({
    periodStart: getMonthStart(requestedMonth),
    periodEnd: getMonthEndExclusive(requestedMonth),
    chartBuilder: () => buildFixedMonthChart(requestedMonth),
  });
  const savedSnapshot = await saveMonthSnapshot({
    monthDate: requestedMonth,
    payload: livePayload,
    source: 'live',
  });

  res.json({
    ...livePayload,
    meta: {
      mode: 'month',
      month: formatMonthKey(requestedMonth),
      scopeLabel: `Live month • ${formatMonthLabel(requestedMonth)}`,
      snapshotSource: 'live',
      snapshotUpdatedAt: savedSnapshot.updatedAt,
      isCurrentPeriod: true,
    },
  });
});

module.exports = {
  getDashboard,
};
