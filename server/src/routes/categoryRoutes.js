const express = require('express');
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { authorize, protect } = require('../middleware/auth');

const router = express.Router();

router.route('/').get(protect, listCategories).post(protect, authorize('admin'), createCategory);
router
  .route('/:id')
  .put(protect, authorize('admin'), updateCategory)
  .delete(protect, authorize('admin'), deleteCategory);

module.exports = router;
