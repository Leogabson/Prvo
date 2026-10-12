import postgres from 'postgres';
import { env } from '../src/config/env.js';

async function main() {
  const client = postgres(env.DATABASE_URL_UNPOOLED || env.DATABASE_URL, { max: 1 });
  console.log('Querying public schema tables...');
  const tables = await client`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  console.log('Existing tables:');
  console.table(tables.map((t: { table_name: string }) => ({ table_name: t.table_name })));

  const planLimits = await client`
    SELECT plan, key, value FROM plan_limits;
  `;
  console.log('Seeded plan_limits:');
  console.table(planLimits);

  await client.end();
}

main().catch((err) => {
  console.error('Error verifying tables:', err);
  process.exit(1);
});
