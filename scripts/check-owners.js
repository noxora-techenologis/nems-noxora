import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  const client = await pool.connect();
  try {
    // Check existing owners and shares
    const owners = await client.query('SELECT * FROM "owners"');
    console.log('Owners:', JSON.stringify(owners.rows, null, 2));

    const shares = await client.query('SELECT * FROM "shares"');
    console.log('Shares:', JSON.stringify(shares.rows, null, 2));

    const valuation = await client.query('SELECT * FROM "company_valuation"');
    console.log('Valuation:', JSON.stringify(valuation.rows, null, 2));

    const users = await client.query('SELECT user_id, name, email FROM "users"');
    console.log('Users:', JSON.stringify(users.rows, null, 2));

    const roles = await client.query('SELECT * FROM "roles"');
    console.log('Roles:', JSON.stringify(roles.rows.map(r => ({ role_id: r.role_id, role_name: r.role_name })), null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

fix().catch(e => { console.error(e); process.exit(1); });
