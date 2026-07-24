import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  const client = await pool.connect();
  try {
    // Delete wrong owners (user_id 9 and 8)
    const wrongOwners = await client.query(`SELECT "owner_id" FROM "owners" WHERE "user_id" IN (9, 8)`);
    for (const row of wrongOwners.rows) {
      await client.query(`DELETE FROM "shares" WHERE "owner_id" = $1`, [row.owner_id]);
      await client.query(`DELETE FROM "owners" WHERE "owner_id" = $1`, [row.owner_id]);
    }
    console.log('Removed owner records for user_id 9 and 8');

    // Update shares for user_id 7 and 10: 500 each, 50%
    await client.query(`UPDATE "shares" SET "total_shares" = 500, "ownership_percentage" = 50 WHERE "owner_id" IN (SELECT "owner_id" FROM "owners" WHERE "user_id" IN (7, 10))`);
    console.log('Updated shares: 500 each (50%)');

    // Verify
    const result = await client.query(`
      SELECT o.name, s.total_shares, s.ownership_percentage
      FROM "owners" o JOIN "shares" s ON o.owner_id = s.owner_id
    `);
    console.log('\nFinal owners:');
    for (const r of result.rows) {
      console.log(`  ${r.name}: ${r.total_shares} سهم (${r.ownership_percentage}%)`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

fix().catch(e => { console.error(e); process.exit(1); });
