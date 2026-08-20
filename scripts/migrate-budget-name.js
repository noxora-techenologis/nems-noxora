import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Mx2LkwqnmG3p@ep-wild-heart-ayb4bk6o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function query(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows;
}

const migrations = [
  `ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "name" VARCHAR(200) DEFAULT 'ميزانية الشركة'`,
  `ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "description" TEXT`,
];

async function run() {
  for (const sql of migrations) {
    try {
      await query(sql);
      console.log('OK:', sql.substring(0, 80));
    } catch (err) {
      console.error('FAIL:', sql.substring(0, 80), err.message);
    }
  }
  process.exit(0);
}

run();
