const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const tables = ['clients', 'employees', 'tasks', 'projects', 'meetings', 'messages', 'files', 'salaries', 'owners', 'votes'];
  for (const t of tables) {
    const r = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`, [t]);
    console.log(`${t}: ${r.rows.map(x=>x.column_name).join(', ')}`);
  }
  await pool.end();
}
check().catch(e => { console.error(e); process.exit(1); });
