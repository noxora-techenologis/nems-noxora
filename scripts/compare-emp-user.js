import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const client = await pool.connect();
  try {
    const emp = await client.query(`SELECT e.employee_id, e.user_id, e.name as emp_name, e.email as emp_email, e.job_title, e.salary, e.employment_status FROM "employees" e`);
    const usr = await client.query(`SELECT user_id, name as usr_name, email as usr_email FROM "users"`);

    console.log('=== مقارنة الموظفين والمستخدمين ===\n');
    for (const e of emp.rows) {
      const u = usr.rows.find(r => r.user_id === e.user_id);
      console.log(`Employee #${e.employee_id}:`);
      console.log(`  emp_name:  ${e.emp_name}`);
      console.log(`  emp_email: ${e.emp_email}`);
      console.log(`  job_title: ${e.job_title}`);
      console.log(`  salary:    ${e.salary}`);
      console.log(`  status:    ${e.employment_status}`);
      if (u) {
        console.log(`  usr_name:  ${u.usr_name}`);
        console.log(`  usr_email: ${u.usr_email}`);
        const nameMatch = e.emp_name === u.usr_name;
        const emailMatch = e.emp_email === u.usr_email;
        console.log(`  name match: ${nameMatch ? '✅' : '❌ ' + e.emp_name + ' vs ' + u.usr_name}`);
        console.log(`  email match: ${emailMatch ? '✅' : '❌ ' + (e.emp_email || 'null') + ' vs ' + u.usr_email}`);
      } else {
        console.log(`  ❌ No matching user found`);
      }
      console.log('');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(e => { console.error(e); process.exit(1); });
