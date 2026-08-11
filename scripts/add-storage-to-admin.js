const { Pool } = require('pg');

const connStr = 'postgresql://neondb_owner:npg_Mx2LkwqnmG3p@ep-wild-heart-ayb4bk6o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

async function addStorage() {
  const client = await pool.connect();
  try {
    const result = await client.query(`SELECT "sidebar_modules" FROM "roles" WHERE "role_id" = 1`);
    const current = result.rows[0]?.sidebar_modules || [];

    if (current.includes('storage')) {
      console.log('storage module already exists for admin role');
      return;
    }

    const updated = [...current, 'storage'];
    await client.query(`UPDATE "roles" SET "sidebar_modules" = $1 WHERE "role_id" = 1`, [JSON.stringify(updated)]);
    console.log(`Updated admin sidebar_modules: ${JSON.stringify(updated)}`);
  } finally {
    client.release();
    await pool.end();
  }
}

addStorage().catch(e => { console.error(e); process.exit(1); });
