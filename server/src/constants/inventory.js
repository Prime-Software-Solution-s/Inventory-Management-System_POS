const getAvailableQuantityExpression = () => ({
  $subtract: ['$quantity', '$reservedQuantity'],
});

const getOutOfStockExpression = () => ({
  $lte: [getAvailableQuantityExpression(), 0],
});

const getLowStockExpression = () => ({
  $and: [
    { $gt: [getAvailableQuantityExpression(), 0] },
    { $lte: [getAvailableQuantityExpression(), '$lowStockThreshold'] },
  ],
});

const getHealthyStockExpression = () => ({
  $gt: [getAvailableQuantityExpression(), '$lowStockThreshold'],
});

module.exports = {
  getAvailableQuantityExpression,
  getHealthyStockExpression,
  getLowStockExpression,
  getOutOfStockExpression,
};
