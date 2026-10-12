import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Smoke-test table verifying database connection and migration execution.
 * Do not add product tables in this foundation step.
 */
export const migrationsCheck = pgTable('_migrations_check', {
  id: serial('id').primaryKey(),
  migrationName: text('migration_name').notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
});
