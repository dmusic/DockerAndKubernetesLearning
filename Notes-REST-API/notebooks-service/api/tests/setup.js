import mongoose from 'mongoose';

export default async function globalSetup() {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3001';
  process.env.MONGO_URI = 'mongodb://localhost:27017';
  process.env.MONGO_DB_NAME = 'notebooks_test';
  process.env.JWT_SECRET = 'test_secret_that_is_at_least_32_characters_long';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.LOG_LEVEL = 'error';
  process.env.CORS_ORIGIN = '*';
  process.env.RATE_LIMIT_WINDOW = '15';
  process.env.RATE_LIMIT_MAX = '1000';

  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME,
    serverSelectionTimeoutMS: 5000,
  });

  // Drop all collections to start clean
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }

  await mongoose.connection.close();
}
