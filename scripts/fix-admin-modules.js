import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  const client = await pool.connect();
  try {
    const roles = await client.query('SELECT * FROM "roles"');
    console.log('Current roles:');
    for (const r of roles.rows) {
      console.log(`  ${r.role_id}: ${r.role_name} -> sidebar_modules: ${JSON.stringify(r.sidebar_modules)}`);
    }

    // Update admin role to include 'owners'
    await client.query(`
      UPDATE "roles" 
      SET "sidebar_modules" = '["dashboard","users","settings","logs","owners"]'
      WHERE "role_name" = 'Admin'
    `);
    console.log('\nUpdated Admin role to include "owners" module');

    const updated = await client.query('SELECT * FROM "roles" WHERE "role_name" = \'Admin\'');
    console.log('Admin now:', JSON.stringify(updated.rows[0]?.sidebar_modules));
  } finally {
    client.release();
    await pool.end();
  }
}

fix().catch(e => { console.error(e); process.exit(1); });
