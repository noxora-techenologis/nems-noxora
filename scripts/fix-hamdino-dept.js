import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  const client = await pool.connect();
  try {
    // Create both departments
    const departments = ['صناعة المحتوى', 'التطوير والبرمجة'];
    for (const name of departments) {
      const dept = await client.query(`SELECT * FROM "departments" WHERE name = $1`, [name]);
      if (dept.rows.length === 0) {
        const newDept = await client.query(`INSERT INTO "departments" (name) VALUES ($1) RETURNING department_id`, [name]);
        console.log(`Created department #${newDept.rows[0].department_id}: ${name}`);
      }
    }

    // Update محمد حامدينو → صناعة المحتوى
    const hamdino = await client.query(`SELECT employee_id FROM "employees" WHERE name LIKE '%حامدينو%'`);
    const contentDept = await client.query(`SELECT department_id FROM "departments" WHERE name = 'صناعة المحتوى'`);
    if (hamdino.rows.length > 0 && contentDept.rows.length > 0) {
      await client.query(`UPDATE "employees" SET department_id = $1 WHERE employee_id = $2`, [contentDept.rows[0].department_id, hamdino.rows[0].employee_id]);
      console.log(`Updated حامدينو → صناعة المحتوى`);
    }

    // Update مطور محمد تقي الله → التطوير والبرمجة
    const dev = await client.query(`SELECT employee_id FROM "employees" WHERE name LIKE '%مطور%'`);
    const devDept = await client.query(`SELECT department_id FROM "departments" WHERE name = 'التطوير والبرمجة'`);
    if (dev.rows.length > 0 && devDept.rows.length > 0) {
      await client.query(`UPDATE "employees" SET department_id = $1 WHERE employee_id = $2`, [devDept.rows[0].department_id, dev.rows[0].employee_id]);
      console.log(`Updated مطور محمد تقي الله → التطوير والبرمجة`);
    }

    // List all employees with departments
    const all = await client.query(`
      SELECT e.employee_id, e.name, e.job_title, d.name as dept_name
      FROM "employees" e
      LEFT JOIN "departments" d ON d.department_id = e.department_id
    `);
    console.log('\n=== All employees ===');
    for (const r of all.rows) {
      console.log(`  #${r.employee_id} | ${r.name} | ${r.job_title} | ${r.dept_name}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

fix().catch(e => { console.error(e); process.exit(1); });
