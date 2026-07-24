import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "company_debts" (
      "debt_id" SERIAL PRIMARY KEY,
      "debtor_name" varchar(255) NOT NULL,
      "debtor_type" varchar(50) NOT NULL DEFAULT 'عميل',
      "amount" numeric NOT NULL DEFAULT 0,
      "paid_amount" numeric NOT NULL DEFAULT 0,
      "borrowing_date" date NOT NULL DEFAULT CURRENT_DATE,
      "due_date" date,
      "description" text,
      "status" varchar(50) NOT NULL DEFAULT 'pending',
      "created_by" integer,
      "updated_at" timestamp DEFAULT NOW(),
      "created_at" timestamp DEFAULT NOW()
    )
  `);
  console.log('Table company_debts created');

  const r = await client.query('SELECT * FROM "company_debts"');
  console.log('Rows:', r.rows.length);
} finally {
  client.release();
  await pool.end();
}
