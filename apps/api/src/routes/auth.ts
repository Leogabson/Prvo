import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { env } from '../config/env.js';
import { logger } from '../logger.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@prvo/shared';
import {
  hashPassword,
  verifyPassword,
  dummyVerifyPassword,
  generateAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  REFRESH_COOKIE_NAME,
  toSafeUser,
  createPasswordResetToken,
  verifyAndConsumePasswordResetToken,
} from '../services/auth.js';
import { emailService } from '../services/email.js';
import { verifyCsrfOrigin } from '../middleware/auth.js';
import {
  loginRateLimiter,
  registerRateLimiter,
  forgotPasswordRateLimiter,
} from '../middleware/rate-limits.js';

export const authRouter = Router();

/**
 * POST /auth/register
 */
authRouter.post('/register', registerRateLimiter, async (req: Request, res: Response) => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid registration details',
      issues: parseResult.error.issues,
    });
    return;
  }

  const { email, password, name } = parseResult.data;

  // Check if active user already exists
  const existing = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({
      error: 'CONFLICT',
      message: 'An account with this email address already exists',
    });
    return;
  }

  const passwordHash = await hashPassword(password);

  const inserted = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name: name || null,
      role: 'user',
      plan: 'free',
      lastLoginAt: new Date(),
    })
    .returning();

  const newUser = inserted[0]!;
  const userAgent = req.headers['user-agent'];
  const { rawToken } = await createRefreshToken(newUser.id, undefined, userAgent);

  setRefreshTokenCookie(res, rawToken);
  const accessToken = generateAccessToken(newUser);

  res.status(201).json({
    user: toSafeUser(newUser),
    accessToken,
  });
});

/**
 * POST /auth/login
 */
authRouter.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid credentials payload',
      issues: parseResult.error.issues,
    });
    return;
  }

  const { email, password } = parseResult.data;

  const foundUsers = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  if (foundUsers.length === 0 || !foundUsers[0]!.passwordHash) {
    // Constant-time dummy verification
    await dummyVerifyPassword(password);
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid email or password',
    });
    return;
  }

  const user = foundUsers[0]!;
  if (!user.passwordHash) {
    await dummyVerifyPassword(password);
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid email or password',
    });
    return;
  }

  const isMatch = await verifyPassword(user.passwordHash, password);

  if (!isMatch) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid email or password',
    });
    return;
  }

  // Update last login
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  const userAgent = req.headers['user-agent'];
  const { rawToken } = await createRefreshToken(user.id, undefined, userAgent);

  setRefreshTokenCookie(res, rawToken);
  const accessToken = generateAccessToken(user);

  res.status(200).json({
    user: toSafeUser(user),
    accessToken,
  });
});

/**
 * POST /auth/refresh
 */
authRouter.post('/refresh', verifyCsrfOrigin, async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

  if (!token || typeof token !== 'string') {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'No refresh token provided',
    });
    return;
  }

  const userAgent = req.headers['user-agent'];
  const result = await rotateRefreshToken(token, userAgent);

  if ('error' in result) {
    clearRefreshTokenCookie(res);
    if (result.error === 'reused') {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Refresh token reuse detected. Token family has been revoked.',
      });
      return;
    }
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired refresh token',
    });
    return;
  }

  setRefreshTokenCookie(res, result.newRefreshToken);

  res.status(200).json({
    accessToken: result.accessToken,
    user: result.user,
  });
});

/**
 * POST /auth/logout
 */
authRouter.post('/logout', verifyCsrfOrigin, async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (token && typeof token === 'string') {
    await revokeRefreshToken(token);
  }

  clearRefreshTokenCookie(res);
  res.status(200).json({
    message: 'Logged out successfully',
  });
});

/**
 * POST /auth/forgot-password
 */
authRouter.post('/forgot-password', forgotPasswordRateLimiter, async (req: Request, res: Response) => {
  const parseResult = forgotPasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid email address',
    });
    return;
  }

  const { email } = parseResult.data;

  // Find user silently
  const found = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  if (found.length > 0) {
    const user = found[0]!;
    try {
      const resetToken = await createPasswordResetToken(user.id);
      const resetLink = `${env.APP_URL}/reset-password?token=${resetToken}`;
      await emailService.sendPasswordResetEmail(user.email, resetLink);
    } catch (err) {
      logger.error({ err, userId: user.id }, 'Error sending password reset email');
    }
  }

  // Constant generic response
  res.status(200).json({
    message: 'If that email is registered, we have sent password reset instructions.',
  });
});

/**
 * POST /auth/reset-password
 */
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  const parseResult = resetPasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid reset parameters',
      issues: parseResult.error.issues,
    });
    return;
  }

  const { token, password } = parseResult.data;
  const newPasswordHash = await hashPassword(password);

  const success = await verifyAndConsumePasswordResetToken(token, newPasswordHash);

  if (!success) {
    res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Invalid or expired password reset token',
    });
    return;
  }

  res.status(200).json({
    message: 'Password has been reset successfully. Please log in with your new password.',
  });
});

/**
 * GET /auth/google
 */
authRouter.get('/google', (_req: Request, res: Response) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    res.status(501).json({
      error: 'NOT_CONFIGURED',
      message: 'Google OAuth is not configured in this environment',
    });
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  res.cookie('prvo_oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 });
  res.cookie('prvo_oauth_verifier', codeVerifier, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 });

  const redirectUri = `${env.API_URL}/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

/**
 * GET /auth/google/callback
 */
authRouter.get('/google/callback', async (req: Request, res: Response) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    res.status(501).json({
      error: 'NOT_CONFIGURED',
      message: 'Google OAuth is not configured in this environment',
    });
    return;
  }

  const { code, state } = req.query;
  const cookieState = req.cookies?.prvo_oauth_state;
  const codeVerifier = req.cookies?.prvo_oauth_verifier;

  if (!code || typeof code !== 'string' || !state || state !== cookieState || !codeVerifier) {
    res.status(400).json({
      error: 'INVALID_OAUTH_STATE',
      message: 'Invalid or missing OAuth state / verifier',
    });
    return;
  }

  res.clearCookie('prvo_oauth_state');
  res.clearCookie('prvo_oauth_verifier');

  try {
    // Exchange authorization code with Google token endpoint
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${env.API_URL}/auth/google/callback`,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      logger.error({ errBody }, 'Google OAuth token exchange failed');
      res.status(400).json({ error: 'OAUTH_FAILED', message: 'Failed to exchange Google OAuth code' });
      return;
    }

    const tokenData = (await tokenRes.json()) as { access_token: string; id_token: string };

    // Fetch user info from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      res.status(400).json({ error: 'OAUTH_FAILED', message: 'Failed to fetch Google user profile' });
      return;
    }

    const googleUser = (await userRes.json()) as {
      id: string;
      email: string;
      verified_email: boolean;
      name?: string;
      picture?: string;
    };

    if (!googleUser.verified_email) {
      res.status(403).json({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Google reported that this email address is not verified',
      });
      return;
    }

    const email = googleUser.email.toLowerCase().trim();

    // Check if user exists by google_id or email
    const existing = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    let userRecord = existing[0];

    if (userRecord) {
      if (!userRecord.googleId) {
        // Link Google account
        await db
          .update(users)
          .set({
            googleId: googleUser.id,
            avatarUrl: userRecord.avatarUrl || googleUser.picture || null,
            name: userRecord.name || googleUser.name || null,
            lastLoginAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, userRecord.id));
      } else {
        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, userRecord.id));
      }
    } else {
      // Create user
      const created = await db
        .insert(users)
        .values({
          email,
          googleId: googleUser.id,
          name: googleUser.name || null,
          avatarUrl: googleUser.picture || null,
          role: 'user',
          plan: 'free',
          lastLoginAt: new Date(),
        })
        .returning();
      userRecord = created[0]!;
    }

    const userAgent = req.headers['user-agent'];
    const { rawToken } = await createRefreshToken(userRecord.id, undefined, userAgent);

    setRefreshTokenCookie(res, rawToken);
    res.redirect(`${env.APP_URL}/dashboard`);
  } catch (err) {
    logger.error({ err }, 'Google OAuth callback exception');
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'OAuth authentication failed' });
  }
});
