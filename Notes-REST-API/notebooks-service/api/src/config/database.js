import mongoose from 'mongoose';
import { env } from './env.js';
import logger from '../utils/logger.js';

export const connectDB = async () => {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('disconnected', () =>
    logger.warn('MongoDB disconnected — Mongoose will attempt to reconnect')
  );
  mongoose.connection.on('reconnected', () =>
    logger.info('MongoDB reconnected')
  );
  mongoose.connection.on('error', (err) =>
    logger.error('MongoDB connection error', { error: err.message })
  );

  await mongoose.connect(env.MONGO_URI, {
    dbName: env.MONGO_DB_NAME,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
  });

  logger.info('MongoDB connected', { dbName: env.MONGO_DB_NAME });
};
