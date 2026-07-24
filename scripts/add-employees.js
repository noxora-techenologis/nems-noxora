import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function add() {
  const client = await pool.connect();
  try {
    const employees = [
      { user_id: 7, name: 'محمد تقي الله', job_title: 'المدير العام', department_id: 1, salary: 5000, employment_status: 'active' },
      { user_id: 9, name: 'مطور محمد تقي الله', job_title: 'مدير النظام', department_id: 1, salary: 4000, employment_status: 'active' },
      { user_id: 8, name: 'محمد حامدينو', job_title: 'موظف تشغيلي', department_id: 1, salary: 2500, employment_status: 'active' },
      { user_id: 10, name: 'سيدي محمد', job_title: 'موظف تشغيلي', department_id: 1, salary: 2500, employment_status: 'active' },
    ];

    for (const e of employees) {
      await client.query(`
        INSERT INTO "employees" ("user_id", "name", "job_title", "department_id", "salary", "employment_status", "created_at")
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [e.user_id, e.name, e.job_title, e.department_id, e.salary, e.employment_status]);
      console.log(`Added employee: ${e.name} (${e.job_title})`);
    }

    const count = await client.query('SELECT COUNT(*) FROM "employees"');
    console.log(`\nTotal employees: ${count.rows[0].count}`);
  } finally {
    client.release();
    await pool.end();
  }
}

add().catch(e => { console.error(e); process.exit(1); });
