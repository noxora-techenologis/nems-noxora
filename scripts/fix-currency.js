import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  const client = await pool.connect();
  try {
    const rev = await client.query(`UPDATE "revenues" SET "currency" = 'MRU' WHERE "currency" = 'SAR' RETURNING *`);
    console.log(`Updated ${rev.rowCount} revenues from SAR to MRU`);

    const exp = await client.query(`UPDATE "expenses" SET "currency" = 'MRU' WHERE "currency" = 'SAR' RETURNING *`);
    console.log(`Updated ${exp.rowCount} expenses from SAR to MRU`);

    const sal = await client.query(`UPDATE "salaries" SET "currency" = 'MRU' WHERE "currency" = 'SAR' RETURNING *`);
    console.log(`Updated ${sal.rowCount} salaries from SAR to MRU`);

    // Check any remaining SAR
    const any = await client.query(`
      SELECT table_name FROM information_schema.columns
      WHERE column_name = 'currency' AND table_schema = 'public'
    `);
    for (const t of any.rows) {
      const cnt = await client.query(`SELECT COUNT(*) FROM "${t.table_name}" WHERE "currency" = 'SAR'`);
      if (Number(cnt.rows[0].count) > 0) {
        console.log(`Still SAR in ${t.table_name}: ${cnt.rows[0].count}`);
      }
    }
    console.log('Done - all currency is MRU');
  } finally {
    client.release();
    await pool.end();
  }
}

fix().catch(e => { console.error(e); process.exit(1); });
