import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();
try {
  const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'roles' ORDER BY ordinal_position`);
  console.log('Columns:', cols.rows.map(c => c.column_name).join(', '));
  const r = await client.query(`SELECT * FROM "roles"`);
  console.log(JSON.stringify(r.rows, null, 2));
} finally {
  client.release();
  await pool.end();
}
