const express = require('express');
const {
  listPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
} = require('../controllers/purchaseOrderController');
const { authorize, protect } = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .get(protect, listPurchaseOrders)
  .post(protect, authorize('admin', 'staff'), createPurchaseOrder);
router.get('/:id', protect, getPurchaseOrder);
router.patch('/:id/status', protect, authorize('admin', 'staff'), updatePurchaseOrderStatus);

module.exports = router;
