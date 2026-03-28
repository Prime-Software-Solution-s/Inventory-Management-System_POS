require('dotenv').config();

const connectDB = require('./config/db');
const app = require('./app');
const { bootstrapAdmin } = require('./services/bootstrapAdmin');
const { startHeldSaleCleanupJob } = require('./services/saleWorkflowService');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await bootstrapAdmin();
    startHeldSaleCleanupJob();
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
