import { env } from './config/env.js';
import { connectDB } from './config/database.js';
import logger from './utils/logger.js';
import app from './app.js';
import mongoose from 'mongoose';

let server;

const startServer = async () => {
  await connectDB();

  server = app.listen(env.PORT, () => {
    logger.info(`notebooks-service started`, { port: env.PORT, env: env.NODE_ENV });
  });
};

const shutdown = async (signal) => {
  logger.info(`${signal} received — starting graceful shutdown`);

  // Force exit if shutdown takes too long
  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000).unref();

  server.close(async () => {
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      clearTimeout(forceExit);
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', { error: err.message });
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer().catch((err) => {
  logger.error('Failed to start server', { error: err.message });
  process.exit(1);
});
