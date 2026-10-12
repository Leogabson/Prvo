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

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL_UNPOOLED (or DATABASE_URL) is not defined.');
    process.exit(1);
  }

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
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    await migrationClient.end();
    process.exit(1);
  }
}

runMigrations();
