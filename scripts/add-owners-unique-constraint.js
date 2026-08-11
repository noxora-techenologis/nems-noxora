import { Pool } from 'pg';

const connStr = 'postgresql://neondb_owner:npg_Mx2LkwqnmG3p@ep-wild-heart-ayb4bk6o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

async function addUniqueConstraint() {
  const client = await pool.connect();
  try {
    // Check if constraint already exists
    const check = await client.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'owners'::regclass AND contype = 'u'
    `);
    const hasUnique = check.rows.some(r => r.conname === 'owners_user_id_unique');

    if (hasUnique) {
      console.log('UNIQUE constraint on owners.user_id already exists');
      return;
    }

    // Remove duplicate owner records first (keep the one with earliest created_at)
    const duplicates = await client.query(`
      DELETE FROM "owners"
      WHERE "owner_id" NOT IN (
        SELECT MIN("owner_id") FROM "owners"
        WHERE "user_id" IS NOT NULL
        GROUP BY "user_id"
      ) AND "user_id" IS NOT NULL
    `);
    if (duplicates.rowCount > 0) {
      console.log(`Removed ${duplicates.rowCount} duplicate owner record(s)`);
    }

    // Also remove owners with NULL user_id
    const nullOwners = await client.query(`DELETE FROM "owners" WHERE "user_id" IS NULL`);
    if (nullOwners.rowCount > 0) {
      console.log(`Removed ${nullOwners.rowCount} owner record(s) with NULL user_id`);
    }

    // Add UNIQUE constraint
    await client.query(`ALTER TABLE "owners" ADD CONSTRAINT owners_user_id_unique UNIQUE ("user_id")`);
    console.log('Added UNIQUE constraint on owners.user_id');
  } finally {
    client.release();
    await pool.end();
  }
}

addUniqueConstraint().catch(e => { console.error(e); process.exit(1); });
