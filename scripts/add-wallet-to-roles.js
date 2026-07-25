const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  try {
    const roles = await pool.query('SELECT * FROM roles');
    for (const role of roles.rows) {
      let modules = role.sidebar_modules || [];
      if (!Array.isArray(modules)) modules = [];

      if (!modules.includes('wallet')) {
        modules.push('wallet');
        await pool.query('UPDATE roles SET sidebar_modules = $1 WHERE role_id = $2', [JSON.stringify(modules), role.role_id]);
        console.log(`Updated role "${role.role_name}" (id=${role.role_id}): added wallet. Modules: ${modules.join(', ')}`);
      } else {
        console.log(`Role "${role.role_name}" already has wallet.`);
      }
    }

    // Also update ROLE_MODULES fallback in auth.js is already done.
    // Verify
    const check = await pool.query('SELECT role_name, sidebar_modules FROM roles');
    console.log('\nFinal sidebar_modules per role:');
    for (const r of check.rows) {
      console.log(`  ${r.role_name}: [${r.sidebar_modules?.join(', ')}]`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

fix();
