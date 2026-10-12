import { Router, type Request, type Response } from 'express';
import { checkDatabaseConnection } from '../db/index.js';
import { BRAND_NAME } from '@prvo/shared';

export const healthRouter = Router();

/**
 * Liveness probe: returns 200 immediately if process is running.
 */
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: BRAND_NAME,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe: checks database connectivity before reporting ready.
 * Returns 200 when Neon database is reachable, 503 if unreachable.
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const isDbHealthy = await checkDatabaseConnection();

  if (!isDbHealthy) {
    res.status(503).json({
      status: 'error',
      service: BRAND_NAME,
      database: 'unreachable',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(200).json({
    status: 'ready',
    service: BRAND_NAME,
    database: 'connected',
    timestamp: new Date().toISOString(),
  });
});
