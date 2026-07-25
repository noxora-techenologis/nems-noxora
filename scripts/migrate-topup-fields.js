const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    const stmts = [
      `ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS sender_name VARCHAR(200)`,
      `ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS screenshot_url TEXT`,
      `ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS bankily_txn_id VARCHAR(30)`,
    ];
    for (const s of stmts) {
      try {
        await pool.query(s);
        console.log('OK:', s.substring(0, 70));
      } catch (e) {
        if (e.message.includes('already exists')) console.log('SKIP:', s.substring(0, 70));
        else console.error('ERROR:', e.message);
      }
    }
    console.log('Migration done.');
  } catch (err) {
    console.error('Failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
