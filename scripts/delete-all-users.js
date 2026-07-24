import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function deleteAllUsers() {
  const client = await pool.connect();
  try {
    const count = await client.query('SELECT COUNT(*) FROM "users"');
    console.log(`Found ${count.rows[0].count} users`);

    // Find ALL foreign keys referencing users table
    const fks = await client.query(`
      SELECT tc.table_name, tc.constraint_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'users'
        AND tc.table_schema = 'public'
    `);
    console.log(`Found ${fks.rows.length} FK constraints referencing users:`);
    fks.rows.forEach(r => console.log(`  - ${r.table_name}.${r.column_name} (${r.constraint_name})`));

    // Drop all FK constraints temporarily
    for (const fk of fks.rows) {
      await client.query(`ALTER TABLE "${fk.table_name}" DROP CONSTRAINT "${fk.constraint_name}"`);
      console.log(`  Dropped: ${fk.constraint_name}`);
    }

    // Now delete all users
    const res = await client.query('DELETE FROM "users"');
    console.log(`\nDeleted ${res.rowCount} users`);

    // Recreate FK constraints
    for (const fk of fks.rows) {
      await client.query(`
        ALTER TABLE "${fk.table_name}"
        ADD CONSTRAINT "${fk.constraint_name}"
        FOREIGN KEY ("${fk.column_name}") REFERENCES "users"("user_id")
      `);
      console.log(`  Recreated: ${fk.constraint_name}`);
    }

    const after = await client.query('SELECT COUNT(*) FROM "users"');
    console.log(`\nRemaining users: ${after.rows[0].count}`);
  } finally {
    client.release();
    await pool.end();
  }
}

deleteAllUsers().catch(e => { console.error(e); process.exit(1); });
