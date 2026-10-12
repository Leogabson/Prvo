import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { hash, verify } from '@node-rs/argon2';
import type { Response } from 'express';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, refreshTokens, passwordResetTokens } from '../db/schema.js';
import { env } from '../config/env.js';
import { logger } from '../logger.js';
import type { SafeUser } from '@prvo/shared';

// Dummy hash for timing-safe login when user is not found
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$dummyhashdummyhash$dummyhashdummyhashdummyhashdummyhashdummyhash';

export interface TokenPayload {
  sub: string;
  email: string;
  role: 'user' | 'admin';
}

export function toSafeUser(user: typeof users.$inferSelect): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatarUrl,
    role: user.role,
    plan: user.plan,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

export async function verifyPassword(passwordHash: string, candidate: string): Promise<boolean> {
  try {
    return await verify(passwordHash, candidate);
  } catch {
    return false;
  }
}

export async function dummyVerifyPassword(candidate: string): Promise<void> {
  try {
    await verify(DUMMY_HASH, candidate);
  } catch {
    // Expected to fail, runs argon2 to match execution timing
  }
}

export function generateAccessToken(user: { id: string; email: string; role: 'user' | 'admin' }): string {
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: '15m',
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export const REFRESH_COOKIE_NAME = 'prvo_refresh_token';

export function setRefreshTokenCookie(res: Response, token: string): void {
  const isProduction = env.NODE_ENV === 'production';
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  const isProduction = env.NODE_ENV === 'production';
  res.cookie(REFRESH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/auth',
    maxAge: 0,
  });
}

export async function createRefreshToken(
  userId: string,
  familyId: string = crypto.randomUUID(),
  userAgent?: string
): Promise<{ rawToken: string; familyId: string }> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokens).values({
    userId,
    familyId,
    tokenHash,
    expiresAt,
    userAgent: userAgent || null,
  });

  return { rawToken, familyId };
}

export async function rotateRefreshToken(
  rawToken: string,
  userAgent?: string
): Promise<{ accessToken: string; newRefreshToken: string; user: SafeUser } | { error: 'invalid' | 'reused' }> {
  const tokenHash = hashToken(rawToken);

  const existingTokens = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (existingTokens.length === 0) {
    return { error: 'invalid' };
  }

  const tokenRecord = existingTokens[0]!;

  // Check if token was already revoked -> Token family reuse attack detected!
  if (tokenRecord.revokedAt !== null) {
    logger.warn(
      { familyId: tokenRecord.familyId, userId: tokenRecord.userId },
      'Refresh token reuse detected! Revoking token family.'
    );
    // Revoke all tokens in family
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.familyId, tokenRecord.familyId));

    return { error: 'reused' };
  }

  // Check if expired
  if (tokenRecord.expiresAt < new Date()) {
    return { error: 'invalid' };
  }

  // Get user
  const userRecords = await db
    .select()
    .from(users)
    .where(and(eq(users.id, tokenRecord.userId), isNull(users.deletedAt)))
    .limit(1);

  if (userRecords.length === 0) {
    return { error: 'invalid' };
  }

  const user = userRecords[0]!;

  // Generate new token in same family
  const newRawToken = crypto.randomBytes(32).toString('hex');
  const newTokenHash = hashToken(newRawToken);
  const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const newTokenId = crypto.randomUUID();

  // Mark current token as revoked with replacement link
  await db
    .update(refreshTokens)
    .set({
      revokedAt: new Date(),
      replacedById: newTokenId,
      updatedAt: new Date(),
    })
    .where(eq(refreshTokens.id, tokenRecord.id));

  // Insert new token
  await db.insert(refreshTokens).values({
    id: newTokenId,
    userId: user.id,
    familyId: tokenRecord.familyId,
    tokenHash: newTokenHash,
    expiresAt: newExpiresAt,
    userAgent: userAgent || null,
  });

  const accessToken = generateAccessToken(user);

  return {
    accessToken,
    newRefreshToken: newRawToken,
    user: toSafeUser(user),
  };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(refreshTokens.userId, userId));
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return rawToken;
}

export async function verifyAndConsumePasswordResetToken(
  rawToken: string,
  newPasswordHash: string
): Promise<boolean> {
  const tokenHash = hashToken(rawToken);

  const records = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt)
      )
    )
    .limit(1);

  if (records.length === 0) {
    return false;
  }

  const record = records[0]!;

  if (record.expiresAt < new Date()) {
    return false;
  }

  // Mark token as used
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date(), updatedAt: new Date() })
    .where(eq(passwordResetTokens.id, record.id));

  // Update user password and revoke all active refresh tokens
  await db
    .update(users)
    .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
    .where(eq(users.id, record.userId));

  await revokeAllUserRefreshTokens(record.userId);

  return true;
}
