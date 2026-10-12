import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit, { MemoryStore } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './logger.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { errorHandler } from './middleware/error-handler.js';
import cookieParser from 'cookie-parser';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { meRouter } from './routes/me.js';
import { ideasRouter } from './routes/ideas.js';
import { NotFoundError } from '@prvo/shared';

export function createApp(): Express {
  const app = express();

  // Trust proxy for rate-limiting behind reverse proxies/ingress
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet());

  // Request ID middleware
  app.use(requestIdMiddleware);

  // Structured logging
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id || 'unknown',
      customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  // CORS allow-list built dynamically from env
  const allowedOrigins = [
    env.APP_URL,
    env.LANDING_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    }),
  );

  // Global rate limiter (excluding GET /health and GET /ready)
  const limiter = rateLimit({
    store: new MemoryStore(),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'GET' && (req.path === '/health' || req.path === '/ready'),
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.',
        timestamp: new Date().toISOString(),
      },
    },
  });
  app.use(limiter);

  // Body parsing and cookies
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Routes
  app.use('/', healthRouter);
  app.use('/auth', authRouter);
  app.use('/me', meRouter);
  app.use('/ideas', ideasRouter);

  // 404 handler
  app.use((req, _res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
  });

  // Central JSON error handler
  app.use(errorHandler);

  return app;
}
