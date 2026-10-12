import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import { logger } from '../logger.js';
import * as schema from './schema.js';

/**
 * Runtime database client using pooled connection string (DATABASE_URL)
 */
export const queryClient = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
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
