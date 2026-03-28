const mongoose = require('mongoose');
const { SALE_STATUS } = require('../constants/sales');

const saleProductSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required.'],
    },
    name: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    products: {
      type: [saleProductSchema],
      validate: [(value) => value.length > 0, 'At least one product is required.'],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    customerName: {
      type: String,
      default: 'Walk-in Customer',
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(SALE_STATUS),
      default: SALE_STATUS.COMPLETED,
    },
    holdExpiresAt: {
      type: Date,
      default: null,
    },
    heldAt: {
      type: Date,
      default: null,
    },
    holdReleasedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

saleSchema.index({ status: 1, holdExpiresAt: 1 });
saleSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);
