import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, type ApiErrorResponse } from '@prvo/shared';
import { logger } from '../logger.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  void _next;
  const timestamp = new Date().toISOString();
  const requestId = req.id ? String(req.id) : undefined;

  if (err instanceof AppError) {
    logger.warn({ err, requestId, path: req.path }, err.message);

    const response: ApiErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        ...(requestId !== undefined && { requestId }),
        timestamp,
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }

  if (err instanceof ZodError) {
    logger.warn({ issues: err.issues, requestId, path: req.path }, 'Validation error');

    const formattedDetails = err.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
      code: i.code,
    }));

    const response: ApiErrorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request payload validation failed',
        details: formattedDetails,
        ...(requestId !== undefined && { requestId }),
        timestamp,
      },
    };

    res.status(400).json(response);
    return;
  }

  // Unhandled / Internal Server Error
  logger.error({ err, requestId, path: req.path }, 'Unhandled server error');

  const isProduction = process.env.NODE_ENV === 'production';
  const message = isProduction ? 'Internal Server Error' : (err instanceof Error ? err.message : 'Unknown error');

  const response: ApiErrorResponse = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
      ...(requestId !== undefined && { requestId }),
      timestamp,
    },
  };

  res.status(500).json(response);
}
