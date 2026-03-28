const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const asyncHandler = require('../middleware/asyncHandler');

const listSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await Supplier.find()
    .select('name company contactPerson phone email address createdAt updatedAt')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ items: suppliers });
});

const getSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id)
    .select('name company contactPerson phone email address createdAt updatedAt')
    .lean();

  if (!supplier) {
    res.status(404);
    throw new Error('Supplier not found.');
  }

  const linkedProducts = await Product.find({ supplier: supplier._id })
    .select('name sku quantity')
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    supplier,
    linkedProducts,
  });
});

const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.create(req.body);
  res.status(201).json(supplier);
});

const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!supplier) {
    res.status(404);
    throw new Error('Supplier not found.');
  }

  res.json(supplier);
});

const deleteSupplier = asyncHandler(async (req, res) => {
  const linkedProduct = await Product.exists({ supplier: req.params.id });

  if (linkedProduct) {
    res.status(409);
    throw new Error('Supplier cannot be deleted because products are linked to it.');
  }

  const supplier = await Supplier.findByIdAndDelete(req.params.id);

  if (!supplier) {
    res.status(404);
    throw new Error('Supplier not found.');
  }

  res.json({ message: 'Supplier deleted successfully.' });
});

module.exports = {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
