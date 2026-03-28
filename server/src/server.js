require('dotenv').config();

const connectDB = require('./config/db');
const app = require('./app');
const { bootstrapAdmin } = require('./services/bootstrapAdmin');
const { startHeldSaleCleanupJob } = require('./services/saleWorkflowService');

const PORT = process.env.PORT || 5000;

const isMissingDatabaseConfigError = (error) =>
  error && typeof error.message === 'string' && error.message.toLowerCase().includes('connection string is not configured');

const isMongoAtlasWhitelistError = (error) => {
  if (!error || typeof error.message !== 'string') {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('mongodb atlas') &&
    (message.includes('isn’t whitelisted') ||
      message.includes("isn't whitelisted") ||
      message.includes('ip that is not whitelisted') ||
      message.includes('ip whitelist') ||
      message.includes('access list'))
  );
};

const startServer = async () => {
  try {
    let dbConnected = false;

    try {
      await connectDB();
      dbConnected = true;
    } catch (error) {
      console.error(error.message);

      if (isMissingDatabaseConfigError(error)) {
        console.error(
          'Starting API without a database connection. Set MONGODB_URI / MONGODB_URL / MONGO_URL / MONGO_URI / DATABASE_URL in Railway Variables.'
        );
      } else if (isMongoAtlasWhitelistError(error)) {
        console.error(
          'MongoDB Atlas blocked the connection (Network Access / IP Access List). Add 0.0.0.0/0 (temporary) or allowlist Railway outbound IPs/private networking.'
        );
        console.error(
          'Starting API without a database connection so the container stays up, but API endpoints that need MongoDB will fail until Atlas allows the connection.'
        );
      } else {
        console.error(
          'Starting API without a database connection so the container stays up, but API endpoints that need MongoDB will fail until the connection works.'
        );
      }
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
