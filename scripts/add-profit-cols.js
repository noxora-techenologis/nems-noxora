import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();
try {
  await client.query(`ALTER TABLE "company_valuation" ADD COLUMN IF NOT EXISTS "retained_earnings" numeric DEFAULT 0`);
  await client.query(`ALTER TABLE "company_valuation" ADD COLUMN IF NOT EXISTS "distributed_profit" numeric DEFAULT 0`);
  await client.query(`ALTER TABLE "company_valuation" ADD COLUMN IF NOT EXISTS "total_shares" numeric DEFAULT 1000`);
  console.log('Added columns: retained_earnings, distributed_profit, total_shares');

  const r = await client.query('SELECT * FROM "company_valuation"');
  console.log(JSON.stringify(r.rows[0], null, 2));
} finally {
  client.release();
  await pool.end();
}
