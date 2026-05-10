import { env } from '../config/env.js';
import logger from '../utils/logger.js';

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details = null;

  // Known operational errors
  if (err.isOperational) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  }
  // Mongoose validation error
  else if (err.name === 'ValidationError') {
    statusCode = 422;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }
  // MongoDB duplicate key
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for ${field}`;
  }
  // JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  // Unexpected errors
  else {
    logger.error('Unexpected error', { error: err.message, stack: err.stack });
  }

  const body = {
    success: false,
    error: { message },
  };

  if (details !== null) {
    body.error.details = details;
  }

  if (env.NODE_ENV === 'development' && statusCode === 500) {
    body.error.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

export default errorHandler;
