const Category = require('../models/Category');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const Sale = require('../models/Sale');
const Supplier = require('../models/Supplier');
const asyncHandler = require('../middleware/asyncHandler');
const {
  getHealthyStockExpression,
  getLowStockExpression,
  getOutOfStockExpression,
} = require('../constants/inventory');
const { cleanupExpiredHeldSales } = require('../services/saleWorkflowService');
const { buildProductBarcode } = require('../utils/barcode');
const {
  createNotification,
  createProductStockNotification,
} = require('../services/notificationService');

const listProductPopulation = [
  { path: 'category', select: 'name' },
  { path: 'supplier', select: 'name' },
];

const detailProductPopulation = [
  { path: 'category', select: 'name icon' },
  { path: 'supplier', select: 'name company email phone' },
];

const listProductSelect =
  'name sku category supplier purchasePrice sellingPrice quantity reservedQuantity lowStockThreshold barcode location createdAt updatedAt';
const detailProductSelect = `${listProductSelect} image createdBy updatedBy lastStockAdjustedBy`;

const parseSort = (sortBy = 'createdAt:desc') => {
  const [field, order = 'desc'] = sortBy.split(':');
  return { [field]: order === 'asc' ? 1 : -1 };
};

const buildFilters = ({ search, category, supplier, stockStatus }) => {
  const filters = {};

  if (search) {
    const pattern = new RegExp(search, 'i');
    filters.$or = [{ name: pattern }, { sku: pattern }, { barcode: pattern }];
  }

  if (category) {
    filters.category = category;
  }

  if (supplier) {
    filters.supplier = supplier;
  }

  if (stockStatus === 'out-of-stock') {
    filters.$expr = getOutOfStockExpression();
  }

  if (stockStatus === 'low-stock') {
    filters.$expr = getLowStockExpression();
  }

  if (stockStatus === 'healthy') {
    filters.$expr = getHealthyStockExpression();
  }

  return filters;
};

const ensureReferencesExist = async ({ category, supplier }) => {
  const categoryDoc = await Category.findById(category).select('_id name').lean();

  if (!categoryDoc) {
    throw new Error('Selected category does not exist.');
  }

  let supplierDoc = null;

  if (supplier) {
    supplierDoc = await Supplier.findById(supplier).select('_id').lean();
  }

  if (supplier && !supplierDoc) {
    throw new Error('Selected supplier does not exist.');
  }

  return {
    categoryDoc,
    supplierDoc,
  };
};

const populateProductList = (query) =>
  query.populate(listProductPopulation).lean({ virtuals: true });

const populateProductDetail = (query) =>
  query.populate(detailProductPopulation).lean({ virtuals: true });

const listProducts = asyncHandler(async (req, res) => {
  await cleanupExpiredHeldSales();
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 8);
  const filters = buildFilters(req.query);

  const [items, totalItems, lowStockItems, outOfStockItems, inventoryValue] = await Promise.all([
    populateProductList(
      Product.find(filters)
        .select(listProductSelect)
        .sort(parseSort(req.query.sortBy))
        .skip((page - 1) * limit)
        .limit(limit)
    ),
    Product.countDocuments(filters),
    Product.countDocuments({
      $expr: getLowStockExpression(),
    }),
    Product.countDocuments({
      $expr: getOutOfStockExpression(),
    }),
    Product.aggregate([
      {
        $group: {
          _id: null,
          total: {
            $sum: { $multiply: ['$quantity', '$purchasePrice'] },
          },
        },
      },
    ]),
  ]);

  res.json({
    items,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
    },
    summary: {
      lowStockItems,
      outOfStockItems,
      inventoryValue: inventoryValue[0]?.total || 0,
    },
  });
});

const getProduct = asyncHandler(async (req, res) => {
  await cleanupExpiredHeldSales();
  const product = await populateProductDetail(
    Product.findById(req.params.id).select(detailProductSelect)
  );

  if (!product) {
    res.status(404);
    throw new Error('Product not found.');
  }

  res.json(product);
});

const createProduct = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    sku: req.body.sku?.toUpperCase(),
    supplier: req.body.supplier || undefined,
  };

  const existingSku = await Product.exists({ sku: payload.sku });

  if (existingSku) {
    res.status(409);
    throw new Error('SKU already exists. Use a unique SKU.');
  }

  const { categoryDoc } = await ensureReferencesExist(payload);
  payload.barcode = buildProductBarcode({
    productName: payload.name,
    categoryName: categoryDoc.name,
    sku: payload.sku,
  });

  let product = await Product.create(payload);
  product.createdBy = req.user._id;
  product.updatedBy = req.user._id;
  await product.save();
  product = await product.populate(detailProductPopulation);

  await createNotification({
    title: 'Product added',
    message: `${product.name} was added to inventory.`,
    type: 'success',
    link: `/products/${product._id}`,
  });
  await createProductStockNotification(product);

  res.status(201).json(product);
});

const updateProduct = asyncHandler(async (req, res) => {
  await cleanupExpiredHeldSales();
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found.');
  }

  const payload = {
    ...req.body,
    sku: req.body.sku?.toUpperCase(),
  };

  if ('supplier' in payload && !payload.supplier) {
    payload.supplier = null;
  }

  if (payload.sku && payload.sku !== product.sku) {
    const duplicate = await Product.exists({ sku: payload.sku });

    if (duplicate) {
      res.status(409);
      throw new Error('SKU already exists. Use a unique SKU.');
    }
  }

  const nextSupplier = Object.prototype.hasOwnProperty.call(payload, 'supplier')
    ? payload.supplier
    : product.supplier;

  const { categoryDoc } = await ensureReferencesExist({
    category: payload.category || product.category,
    supplier: nextSupplier,
  });

  if (
    payload.quantity !== undefined &&
    Number(payload.quantity) < Number(product.reservedQuantity || 0)
  ) {
    res.status(400);
    throw new Error(
      `Quantity cannot be set below reserved stock (${Number(product.reservedQuantity || 0)}).`
    );
  }

  if (payload.name || payload.category || payload.sku || !product.barcode) {
    payload.barcode = buildProductBarcode({
      productName: payload.name || product.name,
      categoryName: categoryDoc.name,
      sku: payload.sku || product.sku,
    });
  }

  Object.assign(product, payload);
  product.updatedBy = req.user._id;
  await product.save();
  await product.populate(detailProductPopulation);

  await createNotification({
    title: 'Product updated',
    message: `${product.name} details were updated.`,
    type: 'info',
    link: `/products/${product._id}`,
  });
  await createProductStockNotification(product);

  res.json(product);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found.');
  }

  const hasHistory = await Promise.all([
    PurchaseOrder.exists({ 'products.product': product._id }),
    Sale.exists({ 'products.product': product._id }),
  ]);

  if (hasHistory.some(Boolean) && req.query.force !== 'true') {
    return res.status(409).json({
      message: 'This product exists in purchase history. Are you sure?',
      requiresConfirmation: true,
    });
  }

  await Product.findByIdAndDelete(product._id);
  await createNotification({
    title: 'Product deleted',
    message: `${product.name} was removed from inventory.`,
    type: 'warning',
    link: '/products',
  });

  res.json({ message: 'Product deleted successfully.' });
});

const adjustStock = asyncHandler(async (req, res) => {
  await cleanupExpiredHeldSales();
  const { type, amount, note } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found.');
  }

  const adjustmentAmount = Number(amount);

  if (!['increase', 'decrease', 'set'].includes(type) || Number.isNaN(adjustmentAmount)) {
    res.status(400);
    throw new Error('Invalid stock adjustment request.');
  }

  let nextQuantity = product.quantity;

  if (type === 'increase') {
    nextQuantity += adjustmentAmount;
  }

  if (type === 'decrease') {
    nextQuantity -= adjustmentAmount;
  }

  if (type === 'set') {
    nextQuantity = adjustmentAmount;
  }

  if (nextQuantity < 0) {
    res.status(400);
    throw new Error('Stock level cannot be negative.');
  }

  if (nextQuantity < Number(product.reservedQuantity || 0)) {
    res.status(400);
    throw new Error(
      `Stock level cannot go below reserved quantity (${Number(product.reservedQuantity || 0)}).`
    );
  }

  product.quantity = nextQuantity;
  product.updatedBy = req.user._id;
  product.lastStockAdjustedBy = req.user._id;
  await product.save();
  await product.populate(detailProductPopulation);

  await createNotification({
    title: 'Stock adjusted',
    message: `${product.name} stock changed to ${product.quantity}. ${note || ''}`.trim(),
    type: 'info',
    link: '/stock',
  });
  await createProductStockNotification(product);

  res.json(product);
});

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
};
