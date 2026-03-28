const Counter = require('../models/Counter');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const {
  FINALIZED_SALE_STATUSES,
  HOLD_DURATION_MINUTES,
  HOLD_DURATION_MS,
  INVOICE_COUNTER_KEY,
  SALE_STATUS,
} = require('../constants/sales');
const {
  createNotification,
  createProductStockNotification,
} = require('./notificationService');

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeCustomerName = (customerName) => {
  const trimmedValue = String(customerName || '').trim();
  return trimmedValue || 'Walk-in Customer';
};

const getHoldReference = (saleLike) => {
  const saleId = saleLike?._id || saleLike;
  return `HOLD-${String(saleId).slice(-6).toUpperCase()}`;
};

const buildInvoiceNumber = (sequence) => `INV-${String(sequence).padStart(6, '0')}`;
const CLEANUP_COOLDOWN_MS = 1000;
let lastCleanupCompletedAt = 0;

const getNextInvoiceNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { key: INVOICE_COUNTER_KEY },
    { $inc: { value: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return buildInvoiceNumber(counter.value);
};

const normalizeInputProducts = (products = []) => {
  if (!Array.isArray(products) || !products.length) {
    throw createHttpError(400, 'At least one sale line is required.');
  }

  const mergedProducts = new Map();

  for (const item of products) {
    const productId = String(item?.product || '').trim();
    const quantity = Number(item?.quantity);

    if (!productId || !Number.isFinite(quantity) || quantity < 1) {
      throw createHttpError(400, 'Each sale line must include a valid product and quantity.');
    }

    const existingLine = mergedProducts.get(productId);

    if (existingLine) {
      existingLine.quantity += quantity;
      continue;
    }

    mergedProducts.set(productId, {
      product: productId,
      quantity,
    });
  }

  return Array.from(mergedProducts.values());
};

const buildQuantityMap = (products = []) => {
  const quantityMap = new Map();

  for (const line of products) {
    quantityMap.set(String(line.product), Number(line.quantity || 0));
  }

  return quantityMap;
};

const getLineName = ({ productId, productMap, fallbackNames }) =>
  productMap.get(productId)?.name || fallbackNames.get(productId) || 'Selected product';

const prepareSalePayload = async ({ customerName, products }) => {
  const normalizedProducts = normalizeInputProducts(products);
  const productIds = normalizedProducts.map((item) => item.product);
  const productDocs = await Product.find({ _id: { $in: productIds } })
    .select('_id name sku sellingPrice quantity reservedQuantity')
    .lean({ virtuals: true });
  const productMap = new Map(productDocs.map((item) => [String(item._id), item]));
  const preparedProducts = [];

  for (const line of normalizedProducts) {
    const product = productMap.get(line.product);

    if (!product) {
      throw createHttpError(400, 'One or more selected products no longer exist.');
    }

    preparedProducts.push({
      product: product._id,
      name: product.name,
      sku: product.sku,
      quantity: line.quantity,
      sellingPrice: product.sellingPrice,
      subtotal: line.quantity * product.sellingPrice,
    });
  }

  return {
    customerName: normalizeCustomerName(customerName),
    preparedProducts,
    productMap,
    totalPrice: preparedProducts.reduce((sum, item) => sum + item.subtotal, 0),
  };
};

const reserveStock = async ({ productId, quantity, lineName }) => {
  if (quantity <= 0) {
    return null;
  }

  const updatedProduct = await Product.findOneAndUpdate(
    {
      _id: productId,
      $expr: {
        $gte: [{ $subtract: ['$quantity', '$reservedQuantity'] }, quantity],
      },
    },
    { $inc: { reservedQuantity: quantity } },
    { new: true }
  );

  if (!updatedProduct) {
    throw createHttpError(400, `${lineName} does not have enough available stock.`);
  }

  return updatedProduct;
};

const releaseReservedStock = async ({ productId, quantity, lineName }) => {
  if (quantity <= 0) {
    return null;
  }

  const updatedProduct = await Product.findOneAndUpdate(
    {
      _id: productId,
      reservedQuantity: { $gte: quantity },
    },
    { $inc: { reservedQuantity: -quantity } },
    { new: true }
  );

  if (!updatedProduct) {
    throw createHttpError(409, `${lineName} reservation is out of sync. Refresh and try again.`);
  }

  return updatedProduct;
};

const sellAvailableStock = async ({ productId, quantity, lineName }) => {
  const updatedProduct = await Product.findOneAndUpdate(
    {
      _id: productId,
      $expr: {
        $gte: [{ $subtract: ['$quantity', '$reservedQuantity'] }, quantity],
      },
    },
    { $inc: { quantity: -quantity } },
    { new: true }
  );

  if (!updatedProduct) {
    throw createHttpError(400, `${lineName} does not have enough available stock.`);
  }

  return updatedProduct;
};

const finalizeReservedStock = async ({ productId, quantity, lineName }) => {
  const updatedProduct = await Product.findOneAndUpdate(
    {
      _id: productId,
      quantity: { $gte: quantity },
      reservedQuantity: { $gte: quantity },
    },
    { $inc: { quantity: -quantity, reservedQuantity: -quantity } },
    { new: true }
  );

  if (!updatedProduct) {
    throw createHttpError(409, `${lineName} hold is no longer valid. Refresh and try again.`);
  }

  return updatedProduct;
};

const rollbackProductAdjustments = async (adjustments = []) => {
  for (const adjustment of [...adjustments].reverse()) {
    try {
      if (adjustment.type === 'reserve') {
        await Product.updateOne(
          { _id: adjustment.productId, reservedQuantity: { $gte: adjustment.quantity } },
          { $inc: { reservedQuantity: -adjustment.quantity } }
        );
      }

      if (adjustment.type === 'release') {
        await Product.updateOne(
          { _id: adjustment.productId },
          { $inc: { reservedQuantity: adjustment.quantity } }
        );
      }

      if (adjustment.type === 'sell') {
        await Product.updateOne(
          { _id: adjustment.productId },
          { $inc: { quantity: adjustment.quantity } }
        );
      }

      if (adjustment.type === 'finalize') {
        await Product.updateOne(
          { _id: adjustment.productId },
          { $inc: { quantity: adjustment.quantity, reservedQuantity: adjustment.quantity } }
        );
      }
    } catch (error) {
      console.error('Failed to roll back sale stock adjustment.', error.message);
    }
  }
};

const emitNotifications = async (jobs = []) => {
  const results = await Promise.allSettled(jobs.map((job) => job()));

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Failed to create notification.', result.reason?.message || result.reason);
    }
  }
};

const buildStockNotificationJobs = (products = []) =>
  products.map((product) => () => createProductStockNotification(product));

const getActiveHoldById = async (saleId) => {
  const sale = await Sale.findById(saleId);

  if (!sale) {
    throw createHttpError(404, 'Invoice not found.');
  }

  if (sale.status !== SALE_STATUS.ON_HOLD) {
    throw createHttpError(400, 'This invoice is not currently on hold.');
  }

  if (sale.holdExpiresAt && sale.holdExpiresAt <= new Date()) {
    throw createHttpError(400, 'This hold has expired. Start a new invoice.');
  }

  return sale;
};

const syncHoldReservation = async ({ currentProducts = [], nextProducts, productMap }) => {
  const currentQuantityMap = buildQuantityMap(currentProducts);
  const nextQuantityMap = buildQuantityMap(nextProducts);
  const fallbackNames = new Map(currentProducts.map((line) => [String(line.product), line.name]));
  const productIds = new Set([...currentQuantityMap.keys(), ...nextQuantityMap.keys()]);
  const adjustments = [];
  const updatedProducts = new Map();

  try {
    for (const productId of productIds) {
      const currentQuantity = currentQuantityMap.get(productId) || 0;
      const nextQuantity = nextQuantityMap.get(productId) || 0;
      const delta = nextQuantity - currentQuantity;
      const lineName = getLineName({ productId, productMap, fallbackNames });

      if (delta > 0) {
        const updatedProduct = await reserveStock({
          lineName,
          productId,
          quantity: delta,
        });
        adjustments.push({ type: 'reserve', productId, quantity: delta });
        updatedProducts.set(productId, updatedProduct);
      }

      if (delta < 0) {
        const updatedProduct = await releaseReservedStock({
          lineName,
          productId,
          quantity: Math.abs(delta),
        });
        adjustments.push({ type: 'release', productId, quantity: Math.abs(delta) });
        updatedProducts.set(productId, updatedProduct);
      }
    }
  } catch (error) {
    await rollbackProductAdjustments(adjustments);
    throw error;
  }

  return {
    adjustments,
    updatedProducts: Array.from(updatedProducts.values()),
  };
};

const buildHoldExpiry = () => new Date(Date.now() + HOLD_DURATION_MS);

const expireHeldSaleUnsafe = async (sale) => {
  const adjustments = [];
  const updatedProducts = [];

  try {
    for (const line of sale.products) {
      const updatedProduct = await releaseReservedStock({
        lineName: line.name,
        productId: line.product,
        quantity: line.quantity,
      });
      adjustments.push({
        type: 'release',
        productId: String(line.product),
        quantity: line.quantity,
      });
      updatedProducts.push(updatedProduct);
    }

    sale.status = SALE_STATUS.EXPIRED;
    sale.holdReleasedAt = new Date();
    sale.holdExpiresAt = null;
    await sale.save();

    await emitNotifications([
      () =>
        createNotification({
          title: 'Invoice hold expired',
          message: `${getHoldReference(sale)} expired after ${HOLD_DURATION_MINUTES} minutes.`,
          type: 'warning',
          link: '/sales',
        }),
      ...buildStockNotificationJobs(updatedProducts),
    ]);
  } catch (error) {
    await rollbackProductAdjustments(adjustments);
    throw error;
  }
};

let workflowQueue = Promise.resolve();

const runSaleWorkflow = async (work) => {
  const nextRun = workflowQueue.then(work, work);
  workflowQueue = nextRun.catch(() => undefined);
  return nextRun;
};

const cleanupExpiredHeldSalesUnsafe = async () => {
  const expiredSales = await Sale.find({
    status: SALE_STATUS.ON_HOLD,
    holdExpiresAt: { $lte: new Date() },
  }).sort({ holdExpiresAt: 1 });

  for (const sale of expiredSales) {
    await expireHeldSaleUnsafe(sale);
  }

  lastCleanupCompletedAt = Date.now();
};

const cleanupExpiredHeldSales = async () => {
  if (Date.now() - lastCleanupCompletedAt < CLEANUP_COOLDOWN_MS) {
    return;
  }

  return runSaleWorkflow(async () => {
    if (Date.now() - lastCleanupCompletedAt < CLEANUP_COOLDOWN_MS) {
      return;
    }

    await cleanupExpiredHeldSalesUnsafe();
  });
};

const createCompletedSale = async ({ customerName, products, userId }) =>
  runSaleWorkflow(async () => {
    await cleanupExpiredHeldSalesUnsafe();

    const {
      customerName: safeCustomerName,
      preparedProducts,
      productMap,
      totalPrice,
    } = await prepareSalePayload({ customerName, products });
    const stockAdjustments = [];
    const updatedProducts = [];

    try {
      for (const line of preparedProducts) {
        const updatedProduct = await sellAvailableStock({
          lineName: productMap.get(String(line.product)).name,
          productId: line.product,
          quantity: line.quantity,
        });
        stockAdjustments.push({
          type: 'sell',
          productId: String(line.product),
          quantity: line.quantity,
        });
        updatedProducts.push(updatedProduct);
      }

      const sale = await Sale.create({
        customerName: safeCustomerName,
        invoiceNumber: await getNextInvoiceNumber(),
        products: preparedProducts,
        totalPrice,
        status: SALE_STATUS.COMPLETED,
        createdBy: userId,
      });

      await emitNotifications([
        () =>
          createNotification({
            title: 'Sale completed',
            message: `${sale.invoiceNumber} closed for ${safeCustomerName}.`,
            type: 'success',
            link: '/sales',
          }),
        ...buildStockNotificationJobs(updatedProducts),
      ]);

      return sale;
    } catch (error) {
      await rollbackProductAdjustments(stockAdjustments);
      throw error;
    }
  });

const createHeldSale = async ({ customerName, products, userId }) =>
  runSaleWorkflow(async () => {
    await cleanupExpiredHeldSalesUnsafe();

    const {
      customerName: safeCustomerName,
      preparedProducts,
      productMap,
      totalPrice,
    } = await prepareSalePayload({ customerName, products });
    const { adjustments, updatedProducts } = await syncHoldReservation({
      currentProducts: [],
      nextProducts: preparedProducts,
      productMap,
    });

    try {
      const sale = await Sale.create({
        customerName: safeCustomerName,
        products: preparedProducts,
        totalPrice,
        status: SALE_STATUS.ON_HOLD,
        holdExpiresAt: buildHoldExpiry(),
        heldAt: new Date(),
        createdBy: userId,
      });

      await emitNotifications([
        () =>
          createNotification({
            title: 'Invoice placed on hold',
            message: `${getHoldReference(sale)} reserved stock for ${HOLD_DURATION_MINUTES} minutes.`,
            type: 'info',
            link: '/sales',
          }),
        ...buildStockNotificationJobs(updatedProducts),
      ]);

      return sale;
    } catch (error) {
      await rollbackProductAdjustments(adjustments);
      throw error;
    }
  });

const updateHeldSale = async ({ saleId, customerName, products }) =>
  runSaleWorkflow(async () => {
    await cleanupExpiredHeldSalesUnsafe();

    const sale = await getActiveHoldById(saleId);
    const {
      customerName: safeCustomerName,
      preparedProducts,
      productMap,
      totalPrice,
    } = await prepareSalePayload({ customerName, products });
    const { adjustments, updatedProducts } = await syncHoldReservation({
      currentProducts: sale.products,
      nextProducts: preparedProducts,
      productMap,
    });

    try {
      sale.customerName = safeCustomerName;
      sale.products = preparedProducts;
      sale.totalPrice = totalPrice;
      sale.heldAt = new Date();
      sale.holdExpiresAt = buildHoldExpiry();
      await sale.save();

      await emitNotifications([
        () =>
          createNotification({
            title: 'Invoice hold updated',
            message: `${getHoldReference(sale)} hold timer was refreshed for ${HOLD_DURATION_MINUTES} minutes.`,
            type: 'info',
            link: '/sales',
          }),
        ...buildStockNotificationJobs(updatedProducts),
      ]);

      return sale;
    } catch (error) {
      await rollbackProductAdjustments(adjustments);
      throw error;
    }
  });

const finalizeHeldSale = async ({ saleId, customerName, products }) =>
  runSaleWorkflow(async () => {
    await cleanupExpiredHeldSalesUnsafe();

    const sale = await getActiveHoldById(saleId);
    const {
      customerName: safeCustomerName,
      preparedProducts,
      productMap,
      totalPrice,
    } = await prepareSalePayload({ customerName, products });
    const { adjustments, updatedProducts: reservationUpdates } = await syncHoldReservation({
      currentProducts: sale.products,
      nextProducts: preparedProducts,
      productMap,
    });
    const finalizeAdjustments = [];
    const finalizedProducts = [];

    try {
      for (const line of preparedProducts) {
        const updatedProduct = await finalizeReservedStock({
          lineName: productMap.get(String(line.product)).name,
          productId: line.product,
          quantity: line.quantity,
        });
        finalizeAdjustments.push({
          type: 'finalize',
          productId: String(line.product),
          quantity: line.quantity,
        });
        finalizedProducts.push(updatedProduct);
      }

      sale.customerName = safeCustomerName;
      sale.invoiceNumber = sale.invoiceNumber || (await getNextInvoiceNumber());
      sale.products = preparedProducts;
      sale.totalPrice = totalPrice;
      sale.status = SALE_STATUS.COMPLETED;
      sale.holdExpiresAt = null;
      sale.holdReleasedAt = new Date();
      await sale.save();

      await emitNotifications([
        () =>
          createNotification({
            title: 'Held invoice completed',
            message: `${sale.invoiceNumber} was finalized for ${safeCustomerName}.`,
            type: 'success',
            link: '/sales',
          }),
        ...buildStockNotificationJobs([...reservationUpdates, ...finalizedProducts]),
      ]);

      return sale;
    } catch (error) {
      await rollbackProductAdjustments(finalizeAdjustments);
      await rollbackProductAdjustments(adjustments);
      throw error;
    }
  });

const releaseHeldSale = async ({ saleId }) =>
  runSaleWorkflow(async () => {
    await cleanupExpiredHeldSalesUnsafe();

    const sale = await getActiveHoldById(saleId);
    const adjustments = [];
    const updatedProducts = [];

    try {
      for (const line of sale.products) {
        const updatedProduct = await releaseReservedStock({
          lineName: line.name,
          productId: line.product,
          quantity: line.quantity,
        });
        adjustments.push({
          type: 'release',
          productId: String(line.product),
          quantity: line.quantity,
        });
        updatedProducts.push(updatedProduct);
      }

      sale.status = SALE_STATUS.CANCELLED;
      sale.holdExpiresAt = null;
      sale.holdReleasedAt = new Date();
      await sale.save();

      await emitNotifications([
        () =>
          createNotification({
            title: 'Invoice hold released',
            message: `${getHoldReference(sale)} stock reservation was released.`,
            type: 'warning',
            link: '/sales',
          }),
        ...buildStockNotificationJobs(updatedProducts),
      ]);

      return sale;
    } catch (error) {
      await rollbackProductAdjustments(adjustments);
      throw error;
    }
  });

let cleanupJob = null;

const startHeldSaleCleanupJob = () => {
  if (cleanupJob) {
    return cleanupJob;
  }

  cleanupJob = setInterval(() => {
    cleanupExpiredHeldSales().catch((error) => {
      console.error('Held sale cleanup failed.', error.message);
    });
  }, 30 * 1000);

  cleanupJob.unref?.();
  cleanupExpiredHeldSales().catch((error) => {
    console.error('Initial held sale cleanup failed.', error.message);
  });

  return cleanupJob;
};

module.exports = {
  FINALIZED_SALE_STATUSES,
  HOLD_DURATION_MINUTES,
  SALE_STATUS,
  cleanupExpiredHeldSales,
  createCompletedSale,
  createHeldSale,
  finalizeHeldSale,
  releaseHeldSale,
  startHeldSaleCleanupJob,
  updateHeldSale,
};
