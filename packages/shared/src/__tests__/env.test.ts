import { describe, it, expect, vi } from 'vitest';
import { apiEnvSchema, migrationEnvSchema, validateEnv, webEnvSchema } from '../env';
import { BRAND_NAME, BRAND_TAGLINE, getBrandConfig } from '../brand';
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_MODEL_FAST,
  GEMINI_RETIREMENT_MESSAGE,
  checkGeminiModelWarnings,
} from '../ai-config';

describe('packages/shared: brand', () => {
  it('exports correct single source of truth brand constants', () => {
    expect(BRAND_NAME).toBe('Prvo');
    expect(BRAND_TAGLINE).toBe('Proof before you build.');
  });

  it('generates URLs using defaults when env is empty', () => {
    const config = getBrandConfig({});
    expect(config.urls.app).toBe('https://prvo.app');
    expect(config.urls.api).toBe('https://api.prvo.app');
    expect(config.urls.landing).toBe('https://go.prvo.app');
    expect(config.getSurveyUrl('test-slug')).toBe('https://prvo.app/s/test-slug');
    expect(config.getLandingTestUrl('test-slug')).toBe('https://go.prvo.app/test-slug');
  });

  it('respects environment overrides for brand URLs', () => {
    const config = getBrandConfig({
      APP_URL: 'http://localhost:3000',
      API_URL: 'http://localhost:4000',
      LANDING_URL: 'http://localhost:3001',
    });
    expect(config.urls.app).toBe('http://localhost:3000');
    expect(config.getSurveyUrl('test-slug')).toBe('http://localhost:3000/s/test-slug');
    expect(config.getLandingTestUrl('test-slug')).toBe('http://localhost:3001/test-slug');
  });
});

describe('packages/shared: env validation', () => {
  const validDevEnv = {
    NODE_ENV: 'development',
    PORT: '4000',
    DATABASE_URL: 'postgresql://postgres:password@localhost:5432/prvo_test?sslmode=disable',
    DATABASE_URL_UNPOOLED: 'postgresql://postgres:password@localhost:5432/prvo_test?sslmode=disable',
    APP_URL: 'http://localhost:3000',
    API_URL: 'http://localhost:4000',
    LANDING_URL: 'http://localhost:3001',
    JWT_ACCESS_SECRET: 'a_very_secure_and_long_jwt_access_secret_123456789',
    JWT_REFRESH_SECRET: 'a_very_secure_and_long_jwt_refresh_secret_123456789',
  };

  it('validates a correct development configuration and applies Gemini defaults', () => {
    const parsed = validateEnv(apiEnvSchema, validDevEnv);
    expect(parsed.PORT).toBe(4000);
    expect(parsed.NODE_ENV).toBe('development');
    expect(parsed.GEMINI_MODEL).toBe(DEFAULT_GEMINI_MODEL);
    expect(parsed.GEMINI_MODEL_FAST).toBe(DEFAULT_GEMINI_MODEL_FAST);
  });

  it('fails fast when required fields are missing', () => {
    const invalidEnv = { ...validDevEnv };
    delete (invalidEnv as Record<string, unknown>).DATABASE_URL;

    expect(() => validateEnv(apiEnvSchema, invalidEnv)).toThrowError(
      /DATABASE_URL/,
    );
  });

  it('strips surrounding quotes from database URLs', () => {
    const quotedEnv = {
      ...validDevEnv,
      DATABASE_URL: '"postgresql://postgres:password@localhost:5432/prvo_test?sslmode=disable"',
      DATABASE_URL_UNPOOLED: "'postgresql://postgres:password@localhost:5432/prvo_test?sslmode=disable'",
    };
    const parsed = validateEnv(apiEnvSchema, quotedEnv);
    expect(parsed.DATABASE_URL).toBe('postgresql://postgres:password@localhost:5432/prvo_test?sslmode=disable');
    expect(parsed.DATABASE_URL_UNPOOLED).toBe('postgresql://postgres:password@localhost:5432/prvo_test?sslmode=disable');
  });

  it('does NOT fall back to DATABASE_URL when DATABASE_URL_UNPOOLED is missing in apiEnvSchema', () => {
    const envWithoutUnpooled = { ...validDevEnv };
    delete (envWithoutUnpooled as Record<string, unknown>).DATABASE_URL_UNPOOLED;

    const parsed = validateEnv(apiEnvSchema, envWithoutUnpooled);
    expect(parsed.DATABASE_URL).toBe(validDevEnv.DATABASE_URL);
    expect(parsed.DATABASE_URL_UNPOOLED).toBeUndefined();
  });

  it('fails fast when JWT secrets are shorter than 32 characters', () => {
    const shortSecretEnv = {
      ...validDevEnv,
      JWT_ACCESS_SECRET: 'short_secret',
    };

    expect(() => validateEnv(apiEnvSchema, shortSecretEnv)).toThrowError(
      /JWT_ACCESS_SECRET must be at least 32 characters long/,
    );
  });

  it('requires GEMINI_API_KEY and provider keys in production mode', () => {
    const prodWithoutGemini = {
      ...validDevEnv,
      NODE_ENV: 'production',
    };

    expect(() => validateEnv(apiEnvSchema, prodWithoutGemini)).toThrowError(
      /GEMINI_API_KEY is mandatory when NODE_ENV is 'production'/,
    );
  });

  it('passes in production mode when all provider keys including GEMINI_API_KEY are present', () => {
    const fullProdEnv = {
      ...validDevEnv,
      NODE_ENV: 'production',
      GEMINI_API_KEY: 'test-gemini-api-key',
      TAVILY_API_KEY: 'tvly-12345',
      BRAVE_API_KEY: 'brave-12345',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      RESEND_API_KEY: 're_test_key_12345',
    };

    const parsed = validateEnv(apiEnvSchema, fullProdEnv);
    expect(parsed.NODE_ENV).toBe('production');
    expect(parsed.GEMINI_API_KEY).toBe('test-gemini-api-key');
    expect(parsed.GEMINI_MODEL).toBe(DEFAULT_GEMINI_MODEL);
    expect(parsed.GEMINI_MODEL_FAST).toBe(DEFAULT_GEMINI_MODEL_FAST);
  });

  it('fails in test mode if TEST_DATABASE_URL is missing', () => {
    const testEnvWithoutTestDb = {
      ...validDevEnv,
      NODE_ENV: 'test',
    };

    expect(() => validateEnv(apiEnvSchema, testEnvWithoutTestDb)).toThrowError(
      /TEST_DATABASE_URL is required when NODE_ENV is "test"/,
    );
  });

  it('fails in test mode if TEST_DATABASE_URL equals DATABASE_URL', () => {
    const collidingTestEnv = {
      ...validDevEnv,
      NODE_ENV: 'test',
      TEST_DATABASE_URL: validDevEnv.DATABASE_URL,
    };

    expect(() => validateEnv(apiEnvSchema, collidingTestEnv)).toThrowError(
      /TEST_DATABASE_URL must not equal DATABASE_URL/,
    );
  });

  it('fails in test mode if TEST_DATABASE_URL equals DATABASE_URL_UNPOOLED', () => {
    const collidingUnpooledEnv = {
      ...validDevEnv,
      NODE_ENV: 'test',
      DATABASE_URL_UNPOOLED: 'postgresql://postgres:password@localhost:5432/unpooled?sslmode=disable',
      TEST_DATABASE_URL: 'postgresql://postgres:password@localhost:5432/unpooled?sslmode=disable',
    };

    expect(() => validateEnv(apiEnvSchema, collidingUnpooledEnv)).toThrowError(
      /TEST_DATABASE_URL must not equal DATABASE_URL_UNPOOLED/,
    );
  });

  it('passes in test mode when TEST_DATABASE_URL is isolated', () => {
    const validTestEnv = {
      ...validDevEnv,
      NODE_ENV: 'test',
      TEST_DATABASE_URL: 'postgresql://postgres:password@localhost:5432/isolated_test_db?sslmode=disable',
    };

    const parsed = validateEnv(apiEnvSchema, validTestEnv);
    expect(parsed.TEST_DATABASE_URL).toBe('postgresql://postgres:password@localhost:5432/isolated_test_db?sslmode=disable');
  });

  it('validates web env schema correctly', () => {
    const parsed = validateEnv(webEnvSchema, {
      NODE_ENV: 'development',
      NEXT_PUBLIC_APP_URL: 'https://prvo.app',
      NEXT_PUBLIC_API_URL: 'https://api.prvo.app',
      NEXT_PUBLIC_LANDING_URL: 'https://go.prvo.app',
    });
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe('https://prvo.app');
  });

  it('migrationEnvSchema requires DATABASE_URL_UNPOOLED and fails when missing', () => {
    expect(() => validateEnv(migrationEnvSchema, {})).toThrowError(/DATABASE_URL_UNPOOLED/);
  });

  it('migrationEnvSchema passes when valid DATABASE_URL_UNPOOLED is provided', () => {
    const parsed = validateEnv(migrationEnvSchema, {
      DATABASE_URL_UNPOOLED: 'postgresql://postgres:password@localhost:5432/prvo_test?sslmode=disable',
    });
    expect(parsed.DATABASE_URL_UNPOOLED).toBe('postgresql://postgres:password@localhost:5432/prvo_test?sslmode=disable');
  });
});

describe('packages/shared: Gemini 2.5 retirement warning', () => {
  it('emits a warning when GEMINI_MODEL starts with gemini-2.5 without throwing an error', () => {
    const warnFn = vi.fn();
    const warnings = checkGeminiModelWarnings('gemini-2.5-flash', 'gemini-3.1-flash-lite', warnFn);

    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain(GEMINI_RETIREMENT_MESSAGE);
    expect(warnFn).toHaveBeenCalledWith(expect.stringContaining(GEMINI_RETIREMENT_MESSAGE));
  });

  it('emits warnings when both GEMINI_MODEL and GEMINI_MODEL_FAST start with gemini-2.5', () => {
    const warnFn = vi.fn();
    const warnings = checkGeminiModelWarnings('gemini-2.5-pro', 'gemini-2.5-flash-lite', warnFn);

    expect(warnings.length).toBe(2);
    expect(warnFn).toHaveBeenCalledTimes(2);
  });

  it('does not emit warnings when models are Gemini 3.x or newer', () => {
    const warnFn = vi.fn();
    const warnings = checkGeminiModelWarnings(DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_MODEL_FAST, warnFn);

    expect(warnings.length).toBe(0);
    expect(warnFn).not.toHaveBeenCalled();
  });
});
