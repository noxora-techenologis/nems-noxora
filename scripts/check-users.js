import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const client = await pool.connect();
  try {
    const r = await client.query('SELECT * FROM "users" LIMIT 5');
    if (r.rows.length > 0) console.log('Columns:', Object.keys(r.rows[0]));
    console.log('Users count:', r.rows.length);
    console.log(JSON.stringify(r.rows, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(e => { console.error(e); process.exit(1); });
