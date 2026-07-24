import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  const client = await pool.connect();
  try {
    // Fix each employee to match its user exactly
    const fixes = [
      { emp_id: 2, user_id: 7 },
      { emp_id: 3, user_id: 9 },
      { emp_id: 4, user_id: 8 },
      { emp_id: 5, user_id: 10 },
    ];

    for (const f of fixes) {
      const user = await client.query(`SELECT name, email FROM "users" WHERE user_id = $1`, [f.user_id]);
      if (user.rows.length === 0) continue;
      const u = user.rows[0];

      await client.query(`
        UPDATE "employees"
        SET "name" = $1, "email" = $2
        WHERE "employee_id" = $3
      `, [u.name, u.email, f.emp_id]);
      console.log(`Fixed employee #${f.emp_id}: name="${u.name}", email="${u.email}"`);
    }

    // Verify
    const result = await client.query(`SELECT e.employee_id, e.name, e.email, e.job_title FROM "employees" e`);
    console.log('\n=== After fix ===');
    for (const r of result.rows) {
      console.log(`  #${r.employee_id} | ${r.name} | ${r.email} | ${r.job_title}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

fix().catch(e => { console.error(e); process.exit(1); });
