import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();
try {
  // CEO (role_id=2): add debts
  await client.query(`UPDATE "roles" SET sidebar_modules = sidebar_modules || '["debts"]'::jsonb WHERE role_id = 2`);
  console.log('CEO updated');

  // FM (role_id=3): add debts
  await client.query(`UPDATE "roles" SET sidebar_modules = sidebar_modules || '["debts"]'::jsonb WHERE role_id = 3`);
  console.log('FM updated');

  // Owner (role_id=7): add debts
  await client.query(`UPDATE "roles" SET sidebar_modules = sidebar_modules || '["debts"]'::jsonb WHERE role_id = 7`);
  console.log('Owner updated');

  // Verify
  const r = await client.query(`SELECT role_id, role_name, sidebar_modules FROM "roles" WHERE role_id IN (2,3,7)`);
  for (const row of r.rows) {
    console.log(`${row.role_name}: ${JSON.stringify(row.sidebar_modules)}`);
  }
} finally {
  client.release();
  await pool.end();
}
