import { describe, it, expect } from 'vitest';
import { getMigrationConnectionString, runMigrations } from '../src/db/migrate.js';

describe('Migration Runner Unpooled Connection Enforcement', () => {
  it('fails with a clear error when DATABASE_URL_UNPOOLED is missing', () => {
    expect(() => getMigrationConnectionString({})).toThrowError(
      /DATABASE_URL_UNPOOLED is required for running database migrations/
    );
  });

  it('fails even if pooled DATABASE_URL is present, proving it NEVER falls back', () => {
    const envWithOnlyPooled = {
      DATABASE_URL: 'postgresql://postgres:password@ep-pooled.neon.tech/neondb?sslmode=require',
    };

    expect(() => getMigrationConnectionString(envWithOnlyPooled)).toThrowError(
      /DATABASE_URL_UNPOOLED is required for running database migrations/
    );
  });

  it('strips surrounding quotes from DATABASE_URL_UNPOOLED', () => {
    const rawUrl = 'postgresql://postgres:password@ep-unpooled.neon.tech/neondb?sslmode=require';
    const envWithQuotes = {
      DATABASE_URL_UNPOOLED: `"${rawUrl}"`,
    };

    const result = getMigrationConnectionString(envWithQuotes);
    expect(result).toBe(rawUrl);
  });

  it('runMigrations rejects with a clear error when DATABASE_URL_UNPOOLED is missing', async () => {
    const originalEnv = process.env.DATABASE_URL_UNPOOLED;
    try {
      delete process.env.DATABASE_URL_UNPOOLED;
      await expect(runMigrations()).rejects.toThrowError(
        /DATABASE_URL_UNPOOLED is required for running database migrations/
      );
    } finally {
      if (originalEnv !== undefined) {
        process.env.DATABASE_URL_UNPOOLED = originalEnv;
      }
    }
  });
});
