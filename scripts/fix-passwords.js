const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connStr = 'postgresql://neondb_owner:npg_Mx2LkwqnmG3p@ep-wild-heart-ayb4bk6o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

async function fix() {
  const client = await pool.connect();
  try {
    const hash = await bcrypt.hash('Medmed123', 12);
    await client.query('UPDATE "users" SET "password_hash" = $1 WHERE "user_id" = 7', [hash]);
    const check = await client.query('SELECT password_hash FROM "users" WHERE "user_id" = 7');
    const match = await bcrypt.compare('Medmed123', check.rows[0].password_hash);
    console.log(`User #7: "Medmed123" => ${match ? 'FIXED ✓' : 'BROKEN ✗'}`);
  } finally {
    client.release();
    await pool.end();
  }
}

fix().catch(e => { console.error(e); process.exit(1); });
