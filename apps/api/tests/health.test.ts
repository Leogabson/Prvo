import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import * as dbModule from '../src/db/index.js';
import { createApp } from '../src/app.js';
import { BRAND_NAME } from '@prvo/shared';

describe('API Health and Readiness Endpoints', () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /health returns 200 and liveness payload', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe(BRAND_NAME);
    expect(res.body.timestamp).toBeDefined();
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('GET /ready returns 200 when database connectivity is healthy', async () => {
    vi.spyOn(dbModule, 'checkDatabaseConnection').mockResolvedValue(true);

    const res = await request(app).get('/ready');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.service).toBe(BRAND_NAME);
    expect(res.body.database).toBe('connected');
  });

  it('GET /ready returns 503 when database connection fails or is unreachable', async () => {
    vi.spyOn(dbModule, 'checkDatabaseConnection').mockResolvedValue(false);

    const res = await request(app).get('/ready');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
    expect(res.body.database).toBe('unreachable');
  });

  it('preserves client-provided x-request-id header', async () => {
    const customId = 'client-req-987654321';
    const res = await request(app)
      .get('/health')
      .set('x-request-id', customId);

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe(customId);
  });

  it('returns standard ApiErrorResponse on 404 routes', async () => {
    const res = await request(app).get('/non-existent-route');

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.requestId).toBeDefined();
  });
});
