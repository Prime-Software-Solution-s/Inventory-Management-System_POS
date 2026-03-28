const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const asyncHandler = require('../middleware/asyncHandler');
const {
  createNotification,
  createProductStockNotification,
} = require('../services/notificationService');

const orderPopulation = [{ path: 'supplier', select: 'name company email phone' }];
const listOrderSelect = 'supplier status orderDate deliveryDate totalAmount createdAt updatedAt';

const listPurchaseOrders = asyncHandler(async (req, res) => {
  const filters = {};

  if (req.query.status) {
    filters.status = req.query.status;
  }

  if (req.query.search) {
    filters.notes = new RegExp(req.query.search, 'i');
  }

  const orders = await PurchaseOrder.find(filters)
    .select(listOrderSelect)
    .populate(orderPopulation)
    .sort({ createdAt: -1 })
    .lean();

  res.json({ items: orders });
});

const getPurchaseOrder = asyncHandler(async (req, res) => {
  const order = await PurchaseOrder.findById(req.params.id)
    .populate(orderPopulation)
    .lean();

  if (!order) {
    res.status(404);
    throw new Error('Purchase order not found.');
  }

  res.json(order);
});

const createPurchaseOrder = asyncHandler(async (req, res) => {
  const { supplier: supplierId, products, deliveryDate, notes, status } = req.body;
  const supplier = await Supplier.findById(supplierId).select('_id name').lean();

  if (!supplier) {
    res.status(400);
    throw new Error('Selected supplier does not exist.');
  }

  const productIds = products.map((item) => item.product);
  const productDocs = await Product.find({ _id: { $in: productIds } })
    .select('_id name sku purchasePrice')
    .lean();
  const productMap = new Map(productDocs.map((item) => [String(item._id), item]));

  const preparedProducts = products.map((item) => {
    const product = productMap.get(String(item.product));

    if (!product) {
      throw new Error('One or more selected products no longer exist.');
    }

    const quantity = Number(item.quantity);
    const subtotal = quantity * product.purchasePrice;

    return {
      product: product._id,
      name: product.name,
      sku: product.sku,
      location: item.location || '',
      quantity,
      costPrice: product.purchasePrice,
      subtotal,
    };
  });

  const totalAmount = preparedProducts.reduce((sum, item) => sum + item.subtotal, 0);
  let order = await PurchaseOrder.create({
    supplier: supplier._id,
    products: preparedProducts,
    totalAmount,
    deliveryDate,
    notes,
    status: status || 'pending',
    createdBy: req.user._id,
    lastStatusUpdatedBy: req.user._id,
  });
  order = await order.populate(orderPopulation);

  await createNotification({
    title: 'Purchase order created',
    message: `Purchase order ${order._id.toString().slice(-6)} created for ${supplier.name}.`,
    type: 'success',
    link: '/purchase-orders',
  });

  res.status(201).json(order);
});

const updatePurchaseOrderStatus = asyncHandler(async (req, res) => {
  const order = await PurchaseOrder.findById(req.params.id).populate(orderPopulation);

  if (!order) {
    res.status(404);
    throw new Error('Purchase order not found.');
  }

  const { status } = req.body;

  if (!['draft', 'pending', 'approved', 'received', 'cancelled'].includes(status)) {
    res.status(400);
    throw new Error('Invalid purchase order status.');
  }

  const wasReceived = order.status === 'received';
  order.status = status;
  order.lastStatusUpdatedBy = req.user._id;
  await order.save();

  if (status === 'received' && !wasReceived) {
    for (const line of order.products) {
      const product = await Product.findById(line.product);

      if (!product) {
        continue;
      }

      product.quantity += line.quantity;
      product.supplier = order.supplier?._id || product.supplier;
      product.location = line.location || product.location;
      await product.save();
      await createProductStockNotification(product);
    }
  }

  await createNotification({
    title: 'Purchase order updated',
    message: `Purchase order ${order._id.toString().slice(-6)} marked as ${status}.`,
    type: status === 'received' ? 'success' : 'info',
    link: '/purchase-orders',
  });

  res.json(order);
});

module.exports = {
  listPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
};
