import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import router from './routes/index.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// Trust the first proxy so rate limiter and logging see the real client IP
app.set('trust proxy', 1);

// 1. HTTP request logging — skip in test environment
if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// 2. CORS
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: env.CORS_ORIGIN !== '*',
  })
);

// 3. Rate limiting
app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW * 60 * 1000,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { message: 'Too many requests, please try again later.' } },
  })
);

// 4. Security headers
app.use(helmet());

// 5. Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// 6. Routes
app.use(router);

// 7. Not found handler
app.use(notFound);

// 8. Global error handler (must be last)
app.use(errorHandler);

export default app;
