const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGODB_URL ||
    process.env.MONGO_URL ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URL;

  if (!mongoUri) {
    throw new Error(
      'Database connection string is not configured (set MONGODB_URI, MONGODB_URL, MONGO_URL, MONGO_URI, or DATABASE_URL).'
    );
  }

  mongoose.set('strictQuery', true);
  const connection = await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: Number(process.env.MONGOOSE_SERVER_SELECTION_TIMEOUT_MS || 10000),
  });

  console.log(`MongoDB connected: ${connection.connection.host}`);
};

module.exports = connectDB;
