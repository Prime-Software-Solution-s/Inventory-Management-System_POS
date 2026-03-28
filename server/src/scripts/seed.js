require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const connectDB = require('../config/db');
const Category = require('../models/Category');
const Notification = require('../models/Notification');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const Sale = require('../models/Sale');
const Supplier = require('../models/Supplier');
const User = require('../models/User');

const seed = async () => {
  await connectDB();

  await Promise.all([
    User.deleteMany(),
    Category.deleteMany(),
    Supplier.deleteMany(),
    Product.deleteMany(),
    PurchaseOrder.deleteMany(),
    Sale.deleteMany(),
    Notification.deleteMany(),
  ]);

  await User.create([
    {
      name: 'Admin User',
      email: 'admin@inventoryos.com',
      password: 'Admin123!',
      role: 'admin',
    },
    {
      name: 'Warehouse Staff',
      email: 'staff@inventoryos.com',
      password: 'Staff123!',
      role: 'staff',
    },
  ]);

  const categories = await Category.create([
    {
      name: 'Electronics',
      description: 'Devices, peripherals, and accessories.',
      icon: 'Cpu',
    },
    {
      name: 'Packaging',
      description: 'Boxes, labels, wraps, and shipping consumables.',
      icon: 'Package',
    },
    {
      name: 'Office Supplies',
      description: 'Administrative and point-of-sale essentials.',
      icon: 'NotebookPen',
    },
  ]);

  const suppliers = await Supplier.create([
    {
      name: 'Nexus Supply',
      contactPerson: 'Mira Hassan',
      phone: '+1 555 420 2001',
      email: 'mira@nexussupply.com',
      address: '44 Harbor Loop, Chicago, IL',
      company: 'Nexus Supply Inc.',
    },
    {
      name: 'BlueCrate Logistics',
      contactPerson: 'Jon Lee',
      phone: '+1 555 420 2002',
      email: 'ops@bluecrate.co',
      address: '18 Warehouse Avenue, Dallas, TX',
      company: 'BlueCrate Logistics',
    },
  ]);

  const products = await Product.create([
    {
      name: 'Wireless Barcode Scanner',
      sku: 'WBS-1001',
      category: categories[0]._id,
      supplier: suppliers[0]._id,
      purchasePrice: 48,
      sellingPrice: 79,
      quantity: 32,
      lowStockThreshold: 8,
      barcode: '890000100001',
      location: 'A1-R2-B4',
    },
    {
      name: 'Thermal Receipt Printer',
      sku: 'TRP-2200',
      category: categories[0]._id,
      supplier: suppliers[0]._id,
      purchasePrice: 92,
      sellingPrice: 139,
      quantity: 7,
      lowStockThreshold: 10,
      barcode: '890000100002',
      location: 'A1-R3-B1',
    },
    {
      name: 'Shipping Carton Pack',
      sku: 'SCP-4000',
      category: categories[1]._id,
      supplier: suppliers[1]._id,
      purchasePrice: 6,
      sellingPrice: 12,
      quantity: 0,
      lowStockThreshold: 20,
      barcode: '890000100003',
      location: 'B4-R1-B3',
    },
  ]);

  await PurchaseOrder.create([
    {
      supplier: suppliers[0]._id,
      products: [
        {
          product: products[0]._id,
          name: products[0].name,
          sku: products[0].sku,
          quantity: 20,
          costPrice: products[0].purchasePrice,
          subtotal: 960,
        },
      ],
      totalAmount: 960,
      status: 'received',
      notes: 'Scanner restock for west warehouse',
      deliveryDate: new Date(),
    },
    {
      supplier: suppliers[1]._id,
      products: [
        {
          product: products[2]._id,
          name: products[2].name,
          sku: products[2].sku,
          quantity: 50,
          costPrice: products[2].purchasePrice,
          subtotal: 300,
        },
      ],
      totalAmount: 300,
      status: 'approved',
      notes: 'Packaging replenishment',
      deliveryDate: new Date(),
    },
  ]);

  await Sale.create([
    {
      customerName: 'Northline Retail',
      products: [
        {
          product: products[0]._id,
          name: products[0].name,
          sku: products[0].sku,
          quantity: 4,
          sellingPrice: products[0].sellingPrice,
          subtotal: 316,
        },
      ],
      totalPrice: 316,
    },
    {
      customerName: 'Walk-in Customer',
      products: [
        {
          product: products[1]._id,
          name: products[1].name,
          sku: products[1].sku,
          quantity: 1,
          sellingPrice: products[1].sellingPrice,
          subtotal: 139,
        },
      ],
      totalPrice: 139,
    },
  ]);

  await Notification.create([
    {
      title: 'Low stock warning',
      message: 'Thermal Receipt Printer is below the low stock threshold.',
      type: 'warning',
      link: '/products',
    },
    {
      title: 'Out of stock alert',
      message: 'Shipping Carton Pack is currently out of stock.',
      type: 'critical',
      link: '/stock',
    },
    {
      title: 'Purchase order updated',
      message: 'Purchase order approved for BlueCrate Logistics.',
      type: 'info',
      link: '/purchase-orders',
    },
  ]);

  console.log('Seed completed.');
  console.log('Admin login: admin@inventoryos.com / Admin123!');
  console.log('Staff login: staff@inventoryos.com / Staff123!');

  process.exit(0);
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
