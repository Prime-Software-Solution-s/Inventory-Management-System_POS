const Sale = require('../models/Sale');
const asyncHandler = require('../middleware/asyncHandler');
const {
  FINALIZED_SALE_STATUSES,
  HOLD_DURATION_MINUTES,
  SALE_STATUS,
  cleanupExpiredHeldSales,
  createCompletedSale,
  createHeldSale,
  finalizeHeldSale,
  releaseHeldSale,
  updateHeldSale,
} = require('../services/saleWorkflowService');

const listSaleSelect =
  'invoiceNumber products totalPrice customerName status holdExpiresAt heldAt holdReleasedAt createdAt updatedAt';

const listSales = asyncHandler(async (req, res) => {
  await cleanupExpiredHeldSales();
  const filters = {};

  if (req.query.search) {
    filters.customerName = new RegExp(req.query.search, 'i');
  }

  const [sales, heldSales] = await Promise.all([
    Sale.find({
      ...filters,
      status: { $in: FINALIZED_SALE_STATUSES },
    })
      .select(listSaleSelect)
      .sort({ createdAt: -1 })
      .lean(),
    Sale.find({
      ...filters,
      status: SALE_STATUS.ON_HOLD,
    })
      .select(listSaleSelect)
      .sort({ holdExpiresAt: 1, updatedAt: -1 })
      .lean(),
  ]);

  res.json({
    holdDurationMinutes: HOLD_DURATION_MINUTES,
    heldItems: heldSales,
    items: sales,
  });
});

const getSale = asyncHandler(async (req, res) => {
  await cleanupExpiredHeldSales();
  const sale = await Sale.findById(req.params.id)
    .select(listSaleSelect)
    .lean();

  if (!sale) {
    res.status(404);
    throw new Error('Sale not found.');
  }

  res.json(sale);
});

const createSale = asyncHandler(async (req, res) => {
  const sale = await createCompletedSale({
    customerName: req.body.customerName,
    products: req.body.products,
    userId: req.user._id,
  });

  res.status(201).json(sale);
});

const createSaleHold = asyncHandler(async (req, res) => {
  const sale = await createHeldSale({
    customerName: req.body.customerName,
    products: req.body.products,
    userId: req.user._id,
  });

  res.status(201).json(sale);
});

const updateSaleHold = asyncHandler(async (req, res) => {
  const sale = await updateHeldSale({
    saleId: req.params.id,
    customerName: req.body.customerName,
    products: req.body.products,
  });

  res.json(sale);
});

const finalizeSaleHold = asyncHandler(async (req, res) => {
  const sale = await finalizeHeldSale({
    saleId: req.params.id,
    customerName: req.body.customerName,
    products: req.body.products,
  });

  res.json(sale);
});

const deleteSaleHold = asyncHandler(async (req, res) => {
  const sale = await releaseHeldSale({
    saleId: req.params.id,
  });

  res.json(sale);
});

module.exports = {
  createSaleHold,
  listSales,
  getSale,
  createSale,
  deleteSaleHold,
  finalizeSaleHold,
  updateSaleHold,
};
