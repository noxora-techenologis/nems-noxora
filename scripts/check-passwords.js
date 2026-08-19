const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connStr = 'postgresql://neondb_owner:npg_Mx2LkwqnmG3p@ep-wild-heart-ayb4bk6o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

// Known passwords from before hashing
const knownPasswords = {
  7: 'Sidi#2010',      // from context
  9: 'admin123',       // from seed.sql
};

async function check() {
  const client = await pool.connect();
  try {
    const r = await client.query('SELECT user_id, name, email, password_hash FROM "users" ORDER BY user_id');
    for (const u of r.rows) {
      const known = knownPasswords[u.user_id];
      if (known) {
        const match = await bcrypt.compare(known, u.password_hash);
        console.log(`User #${u.user_id} (${u.email}): try "${known}" => ${match ? 'MATCH ✓' : 'NO MATCH ✗'}`);
      } else {
        console.log(`User #${u.user_id} (${u.email}): no known password to test`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(e => { console.error(e); process.exit(1); });
