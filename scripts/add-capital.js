import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();
try {
  // Add capital column if not exists
  await client.query(`ALTER TABLE "company_valuation" ADD COLUMN IF NOT EXISTS "capital" numeric DEFAULT 25000`);
  // Set capital = current total_assets (which was the initial capital)
  await client.query(`UPDATE "company_valuation" SET "capital" = "total_assets" WHERE "capital" IS NULL OR "capital" = 0`);
  console.log('Added capital column');
  const r = await client.query('SELECT * FROM "company_valuation"');
  console.log(JSON.stringify(r.rows[0], null, 2));
} finally {
  client.release();
  await pool.end();
}
