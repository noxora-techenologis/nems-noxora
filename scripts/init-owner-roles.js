import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();
try {
  // Update محمد تقي الله to have CEO in active_roles (already approved)
  await client.query(`UPDATE "owners" SET "active_roles" = '["OWNER", "CEO"]'::jsonb WHERE owner_id = 3`);
  console.log('Updated owner #3 active_roles to [OWNER, CEO]');

  // Verify
  const r = await client.query(`SELECT owner_id, name, active_roles FROM "owners"`);
  for (const row of r.rows) {
    console.log(`  #${row.owner_id} ${row.name}: ${JSON.stringify(row.active_roles)}`);
  }
} finally {
  client.release();
  await pool.end();
}
