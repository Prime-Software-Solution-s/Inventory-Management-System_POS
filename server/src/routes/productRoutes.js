const express = require('express');
const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
} = require('../controllers/productController');
const { authorize, protect } = require('../middleware/auth');

const router = express.Router();

router.route('/').get(protect, listProducts).post(protect, authorize('admin'), createProduct);
router.route('/:id/adjust-stock').post(protect, authorize('admin', 'staff'), adjustStock);
router
  .route('/:id')
  .get(protect, getProduct)
  .put(protect, authorize('admin', 'staff'), updateProduct)
  .delete(protect, authorize('admin'), deleteProduct);

module.exports = router;
