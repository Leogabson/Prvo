import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { eq } from 'drizzle-orm';
import { users, refreshTokens, passwordResetTokens } from '../src/db/schema.js';
import { REFRESH_COOKIE_NAME, hashToken } from '../src/services/auth.js';
import { emailService } from '../src/services/email.js';

describe('Auth API Integration & Unit Tests', () => {
  const app = createApp();

  const testUser = {
    email: 'founder@prvo.test',
    password: 'SuperSecretPassword123!',
    name: 'Ada Lovelace',
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    // Clean up users and dependent tokens
    await db.delete(refreshTokens);
    await db.delete(passwordResetTokens);
    await db.delete(users);
  });

  afterAll(async () => {
    await db.delete(refreshTokens);
    await db.delete(passwordResetTokens);
    await db.delete(users);
  });

  it('unit: token hashing produces consistent sha256 output', () => {
    const raw = 'test-refresh-token-string';
    const hash1 = hashToken(raw);
    const hash2 = hashToken(raw);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('POST /auth/register succeeds and issues access token + httpOnly refresh cookie', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.name).toBe(testUser.name);
    expect(res.body.accessToken).toBeDefined();

    // Check refresh cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const refreshCookie = Array.isArray(cookies) ? cookies.find((c) => c.includes(REFRESH_COOKIE_NAME)) : cookies;
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('Path=/auth');
    expect(refreshCookie).toContain('HttpOnly');
  });

  it('POST /auth/register rejects duplicate email with 409', async () => {
    await request(app).post('/auth/register').send(testUser);

    const res2 = await request(app).post('/auth/register').send(testUser);
    expect(res2.status).toBe(409);
    expect(res2.body.error).toBe('CONFLICT');
  });

  it('POST /auth/login returns 200 on valid credentials and 401 on incorrect credentials', async () => {
    await request(app).post('/auth/register').send(testUser);

    // Valid credentials
    const validRes = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(validRes.status).toBe(200);
    expect(validRes.body.accessToken).toBeDefined();
    expect(validRes.body.user.email).toBe(testUser.email);

    // Invalid password
    const badPassRes = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword999!' });

    expect(badPassRes.status).toBe(401);
    expect(badPassRes.body.error).toBe('UNAUTHORIZED');

    // Non-existent email
    const badEmailRes = await request(app)
      .post('/auth/login')
      .send({ email: 'ghost@prvo.test', password: testUser.password });

    expect(badEmailRes.status).toBe(401);
    expect(badEmailRes.body.error).toBe('UNAUTHORIZED');
  });

  it('POST /auth/refresh rejects requests without allowed Origin (CSRF)', async () => {
    const regRes = await request(app).post('/auth/register').send(testUser);
    const cookie = regRes.headers['set-cookie'];

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', cookie)
      .set('Origin', 'https://malicious-site.example.com');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('POST /auth/refresh rotates the refresh token and issues a new access token', async () => {
    const regRes = await request(app).post('/auth/register').send(testUser);
    const initialCookies = regRes.headers['set-cookie'];

    const refreshRes = await request(app)
      .post('/auth/refresh')
      .set('Cookie', initialCookies)
      .set('Origin', 'http://localhost:3000');

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.headers['set-cookie']).toBeDefined();

    const newCookies = refreshRes.headers['set-cookie'];
    expect(newCookies[0]).not.toBe(initialCookies[0]);
  });

  it('Refresh token reuse detection revokes entire token family', async () => {
    const regRes = await request(app).post('/auth/register').send(testUser);
    const initialCookie = regRes.headers['set-cookie'];

    // 1st valid refresh: rotates token
    const refresh1 = await request(app)
      .post('/auth/refresh')
      .set('Cookie', initialCookie)
      .set('Origin', 'http://localhost:3000');
    expect(refresh1.status).toBe(200);
    const rotatedCookie = refresh1.headers['set-cookie'];

    // Attacker tries to use the OLD (already revoked) initial token:
    const reuseAttempt = await request(app)
      .post('/auth/refresh')
      .set('Cookie', initialCookie)
      .set('Origin', 'http://localhost:3000');

    expect(reuseAttempt.status).toBe(401);
    expect(reuseAttempt.body.message).toContain('Token family has been revoked');

    // The rotated token from that same family is now also revoked!
    const subsequentAttempt = await request(app)
      .post('/auth/refresh')
      .set('Cookie', rotatedCookie)
      .set('Origin', 'http://localhost:3000');

    expect(subsequentAttempt.status).toBe(401);
  });

  it('POST /auth/logout revokes refresh token and clears cookie', async () => {
    const regRes = await request(app).post('/auth/register').send(testUser);
    const cookie = regRes.headers['set-cookie'];

    const logoutRes = await request(app)
      .post('/auth/logout')
      .set('Cookie', cookie)
      .set('Origin', 'http://localhost:3000');

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.headers['set-cookie']).toBeDefined();
    expect(logoutRes.headers['set-cookie'][0]).toContain('prvo_refresh_token=;');

    // Subsequent refresh fails
    const failRefresh = await request(app)
      .post('/auth/refresh')
      .set('Cookie', cookie)
      .set('Origin', 'http://localhost:3000');

    expect(failRefresh.status).toBe(401);
  });

  it('POST /auth/forgot-password and /reset-password lifecycle', async () => {
    const regRes = await request(app).post('/auth/register').send(testUser);
    const activeCookie = regRes.headers['set-cookie'];

    let sentResetLink = '';
    vi.spyOn(emailService, 'sendPasswordResetEmail').mockImplementation(async (_to, link) => {
      sentResetLink = link;
    });

    // Known email
    const forgotRes = await request(app)
      .post('/auth/forgot-password')
      .send({ email: testUser.email });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.message).toBe('If that email is registered, we have sent password reset instructions.');
    expect(sentResetLink).toContain('token=');

    // Unknown email returns the EXACT same status and message
    const unknownForgotRes = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'unknown_ghost_email@prvo.test' });

    expect(unknownForgotRes.status).toBe(200);
    expect(unknownForgotRes.body.message).toBe(forgotRes.body.message);

    const token = new URL(sentResetLink).searchParams.get('token')!;

    // Reset password with new password
    const newPass = 'BrandNewPassword987!';
    const resetRes = await request(app)
      .post('/auth/reset-password')
      .send({ token, password: newPass });

    expect(resetRes.status).toBe(200);

    // Old password no longer works
    const oldLogin = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(oldLogin.status).toBe(401);

    // New password works
    const newLogin = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: newPass });
    expect(newLogin.status).toBe(200);

    // Resetting password revokes all refresh tokens for that user
    const refreshWithOldToken = await request(app)
      .post('/auth/refresh')
      .set('Cookie', activeCookie)
      .set('Origin', 'http://localhost:3000');
    expect(refreshWithOldToken.status).toBe(401);

    // Reusing the reset token fails (single use)
    const reuseReset = await request(app)
      .post('/auth/reset-password')
      .send({ token, password: 'AnotherNewPassword123!' });
    expect(reuseReset.status).toBe(400);

    // Expired reset token fails
    const expiredRawToken = 'expired-raw-token-abcdef1234567890';
    const expiredHash = hashToken(expiredRawToken);
    const dbUser = await db.select().from(users).where(eq(users.email, testUser.email)).limit(1);
    await db.insert(passwordResetTokens).values({
      userId: dbUser[0]!.id,
      tokenHash: expiredHash,
      expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
    });

    const expiredAttempt = await request(app)
      .post('/auth/reset-password')
      .send({ token: expiredRawToken, password: 'ExpiredPasswordTry123!' });
    expect(expiredAttempt.status).toBe(400);
    expect(expiredAttempt.body.message).toContain('Invalid or expired password reset token');
  });

  it('GET /me and PATCH /me authenticated endpoints', async () => {
    const regRes = await request(app).post('/auth/register').send(testUser);
    const token = regRes.body.accessToken;

    // GET /me
    const meRes = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(testUser.email);
    expect(meRes.body.usage).toBeDefined();
    expect(meRes.body.usage.activeIdeas).toBe(0);
    expect(meRes.body.usage.limit).toBe(3);

    // PATCH /me
    const patchRes = await request(app)
      .patch('/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Augusta Ada King', avatar_url: 'https://example.com/avatar.png' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.user.name).toBe('Augusta Ada King');
    expect(patchRes.body.user.avatar_url).toBe('https://example.com/avatar.png');
  });

  it('GET /auth/google/callback with mocked provider creates/links user and sets cookie', async () => {
    const { env } = await import('../src/config/env.js');
    (env as { GOOGLE_CLIENT_ID?: string }).GOOGLE_CLIENT_ID = 'mock-client-id';
    (env as { GOOGLE_CLIENT_SECRET?: string }).GOOGLE_CLIENT_SECRET = 'mock-client-secret';

    // Mock global fetch for Google token and profile endpoints
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('oauth2.googleapis.com/token')) {
        return new Response(
          JSON.stringify({ access_token: 'mock-google-access-token', id_token: 'mock-id-token' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (urlStr.includes('googleapis.com/oauth2/v2/userinfo')) {
        return new Response(
          JSON.stringify({
            id: 'google-uid-12345',
            email: 'googlefounder@prvo.test',
            verified_email: true,
            name: 'Google Founder',
            picture: 'https://example.com/google-photo.png',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url);
    });

    try {
      const res = await request(app)
        .get('/auth/google/callback?code=valid-auth-code&state=mock-state-val')
        .set('Cookie', ['prvo_oauth_state=mock-state-val; prvo_oauth_verifier=mock-verifier-val']);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/dashboard');
      expect(res.headers['set-cookie']).toBeDefined();
      const cookies = res.headers['set-cookie'];
      const refreshCookie = Array.isArray(cookies) ? cookies.find((c: string) => c.includes(REFRESH_COOKIE_NAME)) : cookies;
      expect(refreshCookie).toBeDefined();

      // Verify user was persisted
      const dbUsers = await db.select().from(users).where(eq(users.email, 'googlefounder@prvo.test'));
      expect(dbUsers).toHaveLength(1);
      expect(dbUsers[0]!.googleId).toBe('google-uid-12345');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
