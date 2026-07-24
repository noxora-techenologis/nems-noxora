import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const r = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'company_valuation' ORDER BY ordinal_position`);
console.log(r.rows.map(x => x.column_name + ' (' + x.data_type + ')').join('\n'));
await pool.end();
