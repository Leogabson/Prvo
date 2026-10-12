import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '../../.env' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validates and extracts DATABASE_URL_UNPOOLED.
 * The migration runner must use DATABASE_URL_UNPOOLED ONLY and must never fall back to DATABASE_URL.
 */
export function getMigrationConnectionString(envObj: Record<string, string | undefined> = process.env): string {
  const unpooled = envObj.DATABASE_URL_UNPOOLED;

  if (!unpooled || typeof unpooled !== 'string' || unpooled.trim() === '') {
    throw new Error(
      'DATABASE_URL_UNPOOLED is required for running database migrations. The migration runner uses DATABASE_URL_UNPOOLED ONLY and must never fall back to DATABASE_URL.',
    );
  }

  // Quote-stripping sanitization
  const cleaned = unpooled.trim().replace(/^["']|["']$/g, '');
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
      throw new Error('DATABASE_URL_UNPOOLED must be a valid postgresql:// or postgres:// connection URL');
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Must be a valid')) {
      throw err;
    }
    throw new Error('DATABASE_URL_UNPOOLED must be a valid postgresql:// or postgres:// connection URL');
  }

  return cleaned;
}

export async function runMigrations(customConnectionString?: string): Promise<void> {
  const connectionString = customConnectionString ?? getMigrationConnectionString();

  console.log('🔄 Running database migrations using unpooled connection...');

  const migrationClient = postgres(connectionString, {
    max: 1,
    prepare: false,
    connect_timeout: 15,
  });

  const db = drizzle(migrationClient);

  try {
    const migrationsFolder = path.resolve(__dirname, '../../drizzle');
    console.log(`📁 Applying migrations from: ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    console.log('✅ Migrations applied successfully.');
    await migrationClient.end();
  } catch (err) {
    console.error('❌ Migration failed:', err);
    await migrationClient.end();
    throw err;
  }
}

// Auto-run if executed as a CLI script
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
