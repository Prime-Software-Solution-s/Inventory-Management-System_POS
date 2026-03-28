const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const legacyAuthRoutes = require('./routes/legacyAuthRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const productRoutes = require('./routes/productRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const reportRoutes = require('./routes/reportRoutes');
const salesRoutes = require('./routes/salesRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';
const shouldLogRequests = process.env.LOG_REQUESTS === 'true' || !isProduction;

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'", "'unsafe-inline'", 'blob:'],
        "script-src-elem": ["'self'", "'unsafe-inline'", 'blob:'],
        "worker-src": ["'self'", 'blob:'],
      },
    },
  })
);

if (shouldLogRequests) {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}
if (!isProduction) {
  // Development: allow any origin so the app works on any localhost port, LAN IP, etc.
  app.use(cors({ origin: true, credentials: true }));
} else {
  const extraAllowedOrigins = (process.env.EXTRA_CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedOrigins = [clientUrl, ...extraAllowedOrigins];

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          // Allow same-origin / server-to-server requests.
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    })
  );
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/', (req, res) => {
  res.send('API running');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    dbConnected: Boolean(req.app.locals.dbConnected),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    dbConnected: Boolean(req.app.locals.dbConnected),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', legacyAuthRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/uploads', uploadRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
