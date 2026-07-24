import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const client = await pool.connect();
  try {
    const requests = await client.query('SELECT * FROM "position_requests" ORDER BY "request_id"');
    console.log('Position requests:');
    for (const r of requests.rows) {
      console.log(`  #${r.request_id} | owner_id=${r.owner_id} | user_id=${r.user_id} | role=${r.requested_role_name} | status=${r.status} | reason=${r.reason}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(e => { console.error(e); process.exit(1); });
