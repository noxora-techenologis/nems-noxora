const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrate-add-columns.sql'), 'utf8');
  const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
  
  let ok = 0, fail = 0;
  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;
    try {
      await pool.query(trimmed);
      ok++;
      process.stdout.write('.');
    } catch (err) {
      fail++;
      console.error(`\nFAIL: ${err.message}\n  >> ${trimmed.substring(0, 80)}...`);
    }
  }
  console.log(`\nMigration complete: ${ok} OK, ${fail} failed`);
  await pool.end();
}

migrate().catch(err => { console.error(err); process.exit(1); });
