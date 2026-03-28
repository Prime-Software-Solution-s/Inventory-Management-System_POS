const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Supplier = require('../models/Supplier');
const asyncHandler = require('../middleware/asyncHandler');
const { getAvailableQuantityExpression } = require('../constants/inventory');
const {
  FINALIZED_SALE_STATUSES,
  cleanupExpiredHeldSales,
} = require('../services/saleWorkflowService');

const getReports = asyncHandler(async (req, res) => {
  await cleanupExpiredHeldSales();
  const [monthlySales, topProducts, lowStockTrends, supplierSpend, inventorySnapshot] =
    await Promise.all([
      Sale.aggregate([
        {
          $match: {
            status: { $in: FINALIZED_SALE_STATUSES },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            revenue: { $sum: '$totalPrice' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Sale.aggregate([
        {
          $match: {
            status: { $in: FINALIZED_SALE_STATUSES },
          },
        },
        { $unwind: '$products' },
        {
          $group: {
            _id: '$products.product',
            name: { $first: '$products.name' },
            quantity: { $sum: '$products.quantity' },
            revenue: { $sum: '$products.subtotal' },
          },
        },
        { $sort: { quantity: -1 } },
        { $limit: 8 },
      ]),
      Product.aggregate([
        {
          $project: {
            status: {
              $switch: {
                branches: [
                  { case: { $lte: [getAvailableQuantityExpression(), 0] }, then: 'Out of Stock' },
                  {
                    case: { $lte: [getAvailableQuantityExpression(), '$lowStockThreshold'] },
                    then: 'Low Stock',
                  },
                ],
                default: 'Healthy',
              },
            },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      PurchaseOrder.aggregate([
        {
          $group: {
            _id: '$supplier',
            spend: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { spend: -1 } },
      ]),
      Product.aggregate([
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            inventoryValue: { $sum: { $multiply: ['$quantity', '$purchasePrice'] } },
            unitsInStock: { $sum: '$quantity' },
          },
        },
      ]),
    ]);

  const supplierIds = supplierSpend.map((item) => item._id).filter(Boolean);
  const suppliers = await Supplier.find({ _id: { $in: supplierIds } })
    .select('name company')
    .lean();
  const supplierMap = new Map(suppliers.map((item) => [String(item._id), item]));

  res.json({
    monthlySales,
    topProducts,
    lowStockTrends,
    supplierReports: supplierSpend.map((item) => ({
      ...item,
      supplier: supplierMap.get(String(item._id)) || null,
    })),
    inventory: inventorySnapshot[0] || {
      totalProducts: 0,
      inventoryValue: 0,
      unitsInStock: 0,
    },
  });
});

module.exports = {
  getReports,
};
