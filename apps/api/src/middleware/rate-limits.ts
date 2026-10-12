import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

const createCustomRateLimiter = (windowMs: number, max: number, endpointName: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test', // Allow rapid test execution
    handler: (req: Request, res: Response) => {
      const resetTime = (req as unknown as { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime;
      const retryAfterSeconds = resetTime
        ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
        : Math.ceil(windowMs / 1000);

      res.status(429).json({
        error: 'TOO_MANY_REQUESTS',
        message: `Too many ${endpointName} requests. Please retry in ${retryAfterSeconds} seconds.`,
        retryAfter: retryAfterSeconds,
      });
    },
  });

export const loginRateLimiter = createCustomRateLimiter(
  15 * 60 * 1000,
  10,
  'login'
);

export const registerRateLimiter = createCustomRateLimiter(
  60 * 60 * 1000,
  5,
  'registration'
);

export const forgotPasswordRateLimiter = createCustomRateLimiter(
  60 * 60 * 1000,
  5,
  'forgot-password'
);
