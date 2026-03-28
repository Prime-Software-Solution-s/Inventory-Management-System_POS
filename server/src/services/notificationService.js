const Notification = require('../models/Notification');

const createNotification = async ({ title, message, type = 'info', link = '/' }) =>
  Notification.create({
    title,
    message,
    type,
    link,
  });

const createProductStockNotification = async (product) => {
  if (product.stockStatus === 'out-of-stock') {
    return createNotification({
      title: 'Product out of stock',
      message: `${product.name} is now out of stock and needs immediate restocking.`,
      type: 'critical',
      link: `/products/${product._id}`,
    });
  }

  if (product.stockStatus === 'low-stock') {
    return createNotification({
      title: 'Low stock warning',
      message: `${product.name} is below the low stock threshold.`,
      type: 'warning',
      link: `/products/${product._id}`,
    });
  }

  return null;
};

module.exports = {
  createNotification,
  createProductStockNotification,
};
