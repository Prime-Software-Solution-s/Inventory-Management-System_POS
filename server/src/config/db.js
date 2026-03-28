const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL;

  if (!mongoUri) {
    throw new Error('Database connection string is not configured (set MONGODB_URI, MONGO_URL, or DATABASE_URL).');
  }

  mongoose.set('strictQuery', true);
  const connection = await mongoose.connect(mongoUri);

  console.log(`MongoDB connected: ${connection.connection.host}`);
};

module.exports = connectDB;
