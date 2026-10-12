import { describe, it, expect } from 'vitest';
import { apiEnvSchema, validateEnv, webEnvSchema } from '../env';
import { BRAND_NAME, BRAND_TAGLINE, getBrandConfig } from '../brand';

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

  it('validates a correct development configuration', () => {
    const parsed = validateEnv(apiEnvSchema, validDevEnv);
    expect(parsed.PORT).toBe(4000);
    expect(parsed.NODE_ENV).toBe('development');
  });

  it('fails fast when required fields are missing', () => {
    const invalidEnv = { ...validDevEnv };
    delete (invalidEnv as Record<string, unknown>).DATABASE_URL;

    expect(() => validateEnv(apiEnvSchema, invalidEnv)).toThrowError(
      /DATABASE_URL/,
    );
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

  it('requires AI and provider keys in production mode', () => {
    const prodWithoutAi = {
      ...validDevEnv,
      NODE_ENV: 'production',
    };

    expect(() => validateEnv(apiEnvSchema, prodWithoutAi)).toThrowError(
      /ANTHROPIC_API_KEY is mandatory when NODE_ENV is 'production'/,
    );
  });

  it('passes in production mode when all provider keys are present', () => {
    const fullProdEnv = {
      ...validDevEnv,
      NODE_ENV: 'production',
      ANTHROPIC_API_KEY: 'sk-ant-12345',
      TAVILY_API_KEY: 'tvly-12345',
      BRAVE_API_KEY: 'brave-12345',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
    };

    const parsed = validateEnv(apiEnvSchema, fullProdEnv);
    expect(parsed.NODE_ENV).toBe('production');
    expect(parsed.ANTHROPIC_API_KEY).toBe('sk-ant-12345');
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
});
