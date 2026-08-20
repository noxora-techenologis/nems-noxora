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
  const cols = await query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'withdrawal_requests'`);
  const existing = new Set(cols.map(c => c.column_name));

  if (!existing.has('completed_by')) {
    await query(`ALTER TABLE "withdrawal_requests" ADD COLUMN "completed_by" INT`);
    console.log('OK: added completed_by');
  } else {
    console.log('SKIP: completed_by already exists');
  }

  if (!existing.has('completed_at')) {
    await query(`ALTER TABLE "withdrawal_requests" ADD COLUMN "completed_at" TIMESTAMP`);
    console.log('OK: added completed_at');
  } else {
    console.log('SKIP: completed_at already exists');
  }

  if (!existing.has('user_id')) {
    await query(`ALTER TABLE "withdrawal_requests" ADD COLUMN "user_id" INT`);
    console.log('OK: added user_id');
  } else {
    console.log('SKIP: user_id already exists');
  }

  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
