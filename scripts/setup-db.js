const { Pool } = require('pg');
const fs = require('fs');

const connStr = 'postgresql://neondb_owner:npg_Mx2LkwqnmG3p@ep-wild-heart-ayb4bk6o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

const schema = fs.readFileSync('scripts/schema.sql', 'utf8');
const seed = fs.readFileSync('scripts/seed.sql', 'utf8');

async function run() {
  try {
    console.log('Creating tables...');
    await pool.query(schema);
    console.log('Tables created OK');

    console.log('Seeding data...');
    await pool.query(seed);
    console.log('Seed data inserted OK');

    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('Tables:', res.rows.map(r => r.table_name).join(', '));

    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log('Users:', userCount.rows[0].count);

    const roleCount = await pool.query('SELECT COUNT(*) FROM roles');
    console.log('Roles:', roleCount.rows[0].count);

    const settingsCount = await pool.query('SELECT COUNT(*) FROM system_settings');
    console.log('Settings:', settingsCount.rows[0].count);

    await pool.end();
    console.log('DONE');
  } catch (e) {
    console.error('ERROR:', e.message);
    await pool.end();
  }
}
run();
