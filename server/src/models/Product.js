const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required.'],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required.'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required.'],
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required.'],
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required.'],
      min: 0,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required.'],
      min: 0,
      default: 0,
    },
    reservedQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: 0,
    },
    barcode: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    image: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastStockAdjustedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.virtual('availableQuantity').get(function getAvailableQuantity() {
  return Math.max(Number(this.quantity || 0) - Number(this.reservedQuantity || 0), 0);
});

productSchema.virtual('stockStatus').get(function getStockStatus() {
  if (this.availableQuantity <= 0) {
    return 'out-of-stock';
  }

  if (this.availableQuantity <= this.lowStockThreshold) {
    return 'low-stock';
  }

  return 'healthy';
});

productSchema.virtual('inventoryValue').get(function getInventoryValue() {
  return Number(this.quantity || 0) * Number(this.purchasePrice || 0);
});

productSchema.index({ createdAt: -1 });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ supplier: 1, createdAt: -1 });
productSchema.index({ barcode: 1 });

module.exports = mongoose.model('Product', productSchema);
