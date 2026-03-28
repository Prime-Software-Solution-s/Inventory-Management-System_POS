const express = require('express');
const {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require('../controllers/supplierController');
const { authorize, protect } = require('../middleware/auth');

const router = express.Router();

router.route('/').get(protect, listSuppliers).post(protect, authorize('admin'), createSupplier);
router
  .route('/:id')
  .get(protect, getSupplier)
  .put(protect, authorize('admin'), updateSupplier)
  .delete(protect, authorize('admin'), deleteSupplier);

module.exports = router;
