import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  const client = await pool.connect();
  try {
    await client.query('UPDATE "system_settings" SET "updated_by" = NULL');
    console.log('Cleared updated_by in system_settings');
    await client.query('ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id")');
    console.log('FK recreated');
    const r = await client.query('SELECT COUNT(*) FROM "users"');
    console.log('Users:', r.rows[0].count);
  } finally {
    client.release();
    await pool.end();
  }
}

fix().catch(e => { console.error(e); process.exit(1); });
