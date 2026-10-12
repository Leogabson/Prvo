import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import { logger } from '../logger.js';
import * as schema from './schema.js';

// Resolve active database URL based on environment
function resolveDatabaseUrl(): string {
  if (env.NODE_ENV === 'test') {
    if (!env.TEST_DATABASE_URL) {
      throw new Error('TEST_DATABASE_URL is not set! Integration tests require a dedicated test database.');
    }
    if (env.TEST_DATABASE_URL === env.DATABASE_URL || (env.DATABASE_URL_UNPOOLED && env.TEST_DATABASE_URL === env.DATABASE_URL_UNPOOLED)) {
      throw new Error('Refusing to run tests: TEST_DATABASE_URL equals DATABASE_URL or DATABASE_URL_UNPOOLED');
    }
    return env.TEST_DATABASE_URL;
  }
  return env.DATABASE_URL;
}

export const activeDatabaseUrl = resolveDatabaseUrl();

/**
 * Runtime database client using pooled connection string or test database
 */
export const queryClient = postgres(activeDatabaseUrl, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 30,
  prepare: false, // Recommended for Neon connection pooling / PgBouncer
  onnotice: () => {}, // Suppress notices
});

export const db = drizzle(queryClient, { schema });

/**
 * Verifies live database connectivity by executing a lightweight query.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const result = await queryClient`SELECT 1 as alive`;
    return Boolean(result && result.length > 0);
  } catch (err) {
    logger.error({ err }, 'Database readiness check failed');
    return false;
  }
}

/**
 * Closes the runtime connection pool gracefully.
 */
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await queryClient.end({ timeout: 5 });
    logger.info('Database connection pool closed successfully');
  } catch (err) {
    logger.error({ err }, 'Error closing database pool');
  }
}
