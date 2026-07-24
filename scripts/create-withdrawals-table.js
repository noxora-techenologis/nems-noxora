import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "withdrawal_requests" (
      "request_id" SERIAL PRIMARY KEY,
      "owner_id" integer NOT NULL,
      "amount" numeric NOT NULL CHECK (amount > 0),
      "status" varchar(50) NOT NULL DEFAULT 'PENDING',
      "payment_method" varchar(100),
      "notes" text,
      "created_by" integer,
      "verified_by" integer,
      "approved_by" integer,
      "completed_by" integer,
      "verified_at" timestamp,
      "approved_at" timestamp,
      "completed_at" timestamp,
      "created_at" timestamp DEFAULT NOW(),
      "updated_at" timestamp DEFAULT NOW()
    )
  `);
  console.log('Table withdrawal_requests created');

  // Add to SAFE_TABLES, PRIMARY_KEYS, MODULE_MAP via comment
  const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'withdrawal_requests' ORDER BY ordinal_position`);
  console.log('Columns:', cols.rows.map(c => c.column_name).join(', '));
} finally {
  client.release();
  await pool.end();
}
