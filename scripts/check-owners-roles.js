import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();
try {
  // Add active_roles array column to owners
  await client.query(`ALTER TABLE "owners" ADD COLUMN IF NOT EXISTS "active_roles" jsonb DEFAULT '["OWNER"]'`);
  console.log('Added active_roles column');

  // Check current owners
  const owners = await client.query(`SELECT owner_id, name, secondary_role_name, active_roles FROM "owners"`);
  console.log('Owners:', JSON.stringify(owners.rows, null, 2));

  // Check position_requests columns
  const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'position_requests' ORDER BY ordinal_position`);
  console.log('position_requests columns:', cols.rows.map(c => c.column_name).join(', '));
} finally {
  client.release();
  await pool.end();
}
