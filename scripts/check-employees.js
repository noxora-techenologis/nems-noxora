import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const client = await pool.connect();
  try {
    const emp = await client.query('SELECT * FROM "employees"');
    console.log('Employees:', emp.rows.length);
    for (const r of emp.rows) {
      console.log(`  #${r.employee_id} | user_id=${r.user_id} | name=${r.name} | job_title=${r.job_title} | department_id=${r.department_id}`);
    }
    const dept = await client.query('SELECT * FROM "departments"');
    console.log('Departments:', dept.rows.length);
    for (const r of dept.rows) {
      console.log(`  #${r.department_id} | name=${r.name}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(e => { console.error(e); process.exit(1); });
