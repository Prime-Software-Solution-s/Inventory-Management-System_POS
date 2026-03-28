const Category = require('../models/Category');
const Product = require('../models/Product');
const asyncHandler = require('../middleware/asyncHandler');

const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find()
    .select('name description icon createdAt updatedAt')
    .sort({ name: 1 })
    .lean();
  res.json({ items: categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  res.status(201).json(category);
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    res.status(404);
    throw new Error('Category not found.');
  }

  res.json(category);
});

const deleteCategory = asyncHandler(async (req, res) => {
  const linkedProduct = await Product.exists({ category: req.params.id });

  if (linkedProduct) {
    res.status(409);
    throw new Error('Category cannot be deleted while products are linked to it.');
  }

  const category = await Category.findByIdAndDelete(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error('Category not found.');
  }

  res.json({ message: 'Category deleted successfully.' });
});

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
