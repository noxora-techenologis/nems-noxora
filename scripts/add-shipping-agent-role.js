const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    // 1. Check if SHIPPING_AGENT role exists
    const rolesRes = await pool.query(`SELECT * FROM roles WHERE role_name = 'SHIPPING_AGENT'`);
    if (rolesRes.rows.length === 0) {
      await pool.query(
        `INSERT INTO roles (role_name, description, dashboard_type, sidebar_modules) VALUES ($1, $2, $3, $4)`,
        [
          'SHIPPING_AGENT',
          'وكيل الشحن — مراجعة واعتماد طلبات الشحن والسحب',
          'shipping_agent',
          JSON.stringify(['dashboard', 'wallet', 'wallet_admin'])
        ]
      );
      console.log('Created role: SHIPPING_AGENT');
    } else {
      // Update sidebar_modules
      await pool.query(
        `UPDATE roles SET sidebar_modules = $1 WHERE role_name = 'SHIPPING_AGENT'`,
        [JSON.stringify(['dashboard', 'wallet', 'wallet_admin'])]
      );
      console.log('Updated role: SHIPPING_AGENT');
    }

    // 2. Get the role_id
    const roleCheck = await pool.query(`SELECT role_id FROM roles WHERE role_name = 'SHIPPING_AGENT'`);
    const roleId = roleCheck.rows[0]?.role_id;
    console.log(`SHIPPING_AGENT role_id: ${roleId}`);

    // 3. Check if any user already has this role
    const users = await pool.query(`SELECT user_id, name, role_id FROM users`);
    console.log('\nCurrent users:');
    for (const u of users.rows) {
      console.log(`  ${u.name} (user_id=${u.user_id}, role_id=${u.role_id})`);
    }

    console.log('\nDone! Now create a user with this role manually or assign existing user.');
    console.log(`Role ID to use: ${roleId}`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
