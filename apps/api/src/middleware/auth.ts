import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type TokenPayload } from '../services/auth.js';
import { env } from '../config/env.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Middleware requiring a valid HS256 JWT access token in the Authorization header.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication token is required',
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  const payload = verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired authentication token',
    });
    return;
  }

  req.user = payload;
  next();
}

/**
 * Validates Origin header for cookie-authenticated endpoints against allowed origins.
 */
export function verifyCsrfOrigin(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  if (!origin) {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Origin header is required for cookie-authenticated requests',
    });
    return;
  }

  const allowedOrigins = new Set([
    env.APP_URL,
    env.LANDING_URL,
    'https://prvo.app',
    'https://go.prvo.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ]);

  if (!allowedOrigins.has(origin)) {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'CSRF Origin verification failed: origin not allowed',
    });
    return;
  }

  next();
}
