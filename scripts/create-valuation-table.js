import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "company_valuation" (
        "valuation_id" SERIAL PRIMARY KEY,
        "total_assets" NUMERIC(15, 2) DEFAULT 0,
        "total_liabilities" NUMERIC(15, 2) DEFAULT 0,
        "notes" TEXT,
        "updated_by" INTEGER REFERENCES "users"("user_id"),
        "updated_at" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created company_valuation table');

    await client.query(`
      INSERT INTO "company_valuation" ("total_assets", "total_liabilities", "notes", "updated_at")
      SELECT 2250000, 150000, 'القيمة التأسيسية الأولية للشركة', NOW()
      WHERE NOT EXISTS (SELECT 1 FROM "company_valuation")
    `);
    console.log('Inserted default valuation row');

    const res = await client.query('SELECT * FROM "company_valuation"');
    console.log('Current valuation:', res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(e => { console.error(e); process.exit(1); });
