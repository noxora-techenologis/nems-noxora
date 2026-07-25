const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  try {
    const payrollRoles = ['Admin', 'CEO', 'FM', 'Owner'];
    const roles = await pool.query('SELECT * FROM roles');
    for (const role of roles.rows) {
      let modules = role.sidebar_modules || [];
      if (!Array.isArray(modules)) modules = [];

      let changed = false;
      if (payrollRoles.includes(role.role_name) && !modules.includes('payroll')) {
        modules.push('payroll');
        changed = true;
      }
      if (changed) {
        await pool.query('UPDATE roles SET sidebar_modules = $1 WHERE role_id = $2', [JSON.stringify(modules), role.role_id]);
        console.log(`Updated "${role.role_name}": [${modules.join(', ')}]`);
      } else {
        console.log(`"${role.role_name}" OK: [${modules.join(', ')}]`);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

fix();
