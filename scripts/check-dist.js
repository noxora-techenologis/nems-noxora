import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();
try {
  const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profit_distributions' ORDER BY ordinal_position`);
  console.log('profit_distributions columns:', cols.rows.map(x => x.column_name + ' (' + x.data_type + ')').join(', '));
  
  const data = await client.query('SELECT * FROM "profit_distributions"');
  console.log('Existing data:', data.rows.length, 'rows');
  if (data.rows.length > 0) console.log(JSON.stringify(data.rows[0], null, 2));

  const shares = await client.query('SELECT * FROM "shares"');
  console.log('\nShares:', JSON.stringify(shares.rows, null, 2));

  const owners = await client.query('SELECT * FROM "owners"');
  console.log('\nOwners:', JSON.stringify(owners.rows, null, 2));

  const val = await client.query('SELECT * FROM "company_valuation"');
  console.log('\nValuation:', JSON.stringify(val.rows[0], null, 2));
} finally {
  client.release();
  await pool.end();
}
