import { queryClient } from './index.js';

async function verify() {
  console.log('🔍 Querying information_schema and _migrations_check table...');
  const columns = await queryClient`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = '_migrations_check'
    ORDER BY ordinal_position;
  `;

  console.log('📋 Columns in _migrations_check:', columns);

  // Insert test row to prove read & write access
  const insertResult = await queryClient`
    INSERT INTO "_migrations_check" ("migration_name") 
    VALUES ('smoke_test_verify') 
    RETURNING id, migration_name, applied_at;
  `;
  console.log('📥 Inserted row into _migrations_check:', insertResult);

  // Read back all rows
  const allRows = await queryClient`
    SELECT id, migration_name, applied_at 
    FROM "_migrations_check";
  `;
  console.log('📤 All rows in _migrations_check:', allRows);

  await queryClient.end();
}

verify().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
