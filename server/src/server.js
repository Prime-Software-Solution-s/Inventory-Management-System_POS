require('dotenv').config();

const connectDB = require('./config/db');
const app = require('./app');
const { bootstrapAdmin } = require('./services/bootstrapAdmin');
const { startHeldSaleCleanupJob } = require('./services/saleWorkflowService');

const PORT = process.env.PORT || 5000;

const isMissingDatabaseConfigError = (error) =>
  error && typeof error.message === 'string' && error.message.toLowerCase().includes('connection string is not configured');

const startServer = async () => {
  try {
    let dbConnected = false;

    try {
      await connectDB();
      dbConnected = true;
    } catch (error) {
      if (!isMissingDatabaseConfigError(error)) {
        throw error;
      }

      console.error(error.message);
      console.error(
        'Starting API without a database connection. Set MONGODB_URI / MONGODB_URL / MONGO_URL / MONGO_URI / DATABASE_URL in Railway Variables.'
      );
    }

    app.locals.dbConnected = dbConnected;

    if (dbConnected) {
      await bootstrapAdmin();
      startHeldSaleCleanupJob();
    }
    const server = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Update PORT in server/.env and restart.`);
        process.exit(1);
      }

      console.error(error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

startServer();
