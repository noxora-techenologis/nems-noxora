import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function approve() {
  const client = await pool.connect();
  try {
    // 1. Approve position request
    await client.query(`
      UPDATE "position_requests"
      SET "status" = 'approved', "approved_by" = 9, "approved_at" = NOW()
      WHERE "request_id" = 1
    `);
    console.log('Approved position request #1');

    // 2. Update owner's secondary role
    await client.query(`
      UPDATE "owners"
      SET "secondary_role_name" = 'CEO'
      WHERE "owner_id" = 3
    `);
    console.log('Set secondary_role_name = CEO for owner_id=3');

    // 3. Update user's role to CEO (role_id=2)
    await client.query(`
      UPDATE "users"
      SET "role_id" = 2
      WHERE "user_id" = 7
    `);
    console.log('Updated user_id=7 role to CEO (role_id=2)');

    // Verify
    const u = await client.query('SELECT user_id, name, email, role_id FROM "users" WHERE user_id = 7');
    const o = await client.query('SELECT owner_id, name, secondary_role_name FROM "owners" WHERE owner_id = 3');
    const p = await client.query('SELECT request_id, status FROM "position_requests" WHERE request_id = 1');
    console.log('\nVerification:');
    console.log('  User:', u.rows[0]);
    console.log('  Owner:', o.rows[0]);
    console.log('  Request:', p.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

approve().catch(e => { console.error(e); process.exit(1); });
