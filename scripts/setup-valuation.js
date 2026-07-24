import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  const client = await pool.connect();
  try {
    // 1. Update valuation to 25,000 MRU
    await client.query(`
      UPDATE "company_valuation"
      SET "total_assets" = 25000, "total_liabilities" = 0,
          "notes" = 'رأس مال الشركة - 25000 أوقية',
          "updated_at" = NOW()
      WHERE "valuation_id" = 1
    `);
    console.log('Updated valuation: 25,000 MRU');

    // 2. Create owners for all 4 users (250 shares each)
    const users = [
      { user_id: 9, name: 'مطور محمد تقي الله' },
      { user_id: 8, name: 'محمد حامدينو' },
      { user_id: 7, name: 'محمد تقي الله' },
      { user_id: 10, name: 'سيدي محمد' },
    ];

    const sharesPerOwner = 250;
    const ownershipPct = 25.00;

    for (const u of users) {
      // Create owner record
      await client.query(`
        INSERT INTO "owners" ("user_id", "name", "join_date", "secondary_role_name", "created_at")
        VALUES ($1, $2, CURRENT_DATE, NULL, NOW())
      `, [u.user_id, u.name]);
      console.log(`Created owner: ${u.name} (user_id=${u.user_id})`);

      // Get the owner_id just inserted
      const ownRes = await client.query(`SELECT "owner_id" FROM "owners" WHERE "user_id" = $1`, [u.user_id]);
      const ownerId = ownRes.rows[0].owner_id;

      // Create shares record
      await client.query(`
        INSERT INTO "shares" ("owner_id", "total_shares", "ownership_percentage", "created_at")
        VALUES ($1, $2, $3, NOW())
      `, [ownerId, sharesPerOwner, ownershipPct]);
      console.log(`  -> ${sharesPerOwner} shares (${ownershipPct}%)`);
    }

    // Verify
    console.log('\n--- Final State ---');
    const finalVal = await client.query('SELECT * FROM "company_valuation"');
    console.log('Valuation:', finalVal.rows[0]);
    const finalOwners = await client.query('SELECT o.owner_id, o.name, s.total_shares, s.ownership_percentage FROM "owners" o JOIN "shares" s ON o.owner_id = s.owner_id');
    console.log('Owners with shares:');
    for (const r of finalOwners.rows) {
      console.log(`  ${r.name}: ${r.total_shares} shares (${r.ownership_percentage}%)`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

setup().catch(e => { console.error(e); process.exit(1); });
