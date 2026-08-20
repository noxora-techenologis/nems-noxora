import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Mx2LkwqnmG3p@ep-wild-heart-ayb4bk6o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function query(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows;
}

async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS debt_payments (
      payment_id   SERIAL PRIMARY KEY,
      debt_id      INT NOT NULL REFERENCES company_debts(debt_id) ON DELETE CASCADE,
      amount       DECIMAL(15,2) NOT NULL,
      paid_date    DATE DEFAULT CURRENT_DATE,
      note         TEXT,
      created_by   INT,
      created_at   TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);`);

  console.log('OK: debt_payments table created');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
