const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  const stmts = [
    `ALTER TABLE clients ADD COLUMN IF NOT EXISTS country VARCHAR(100)`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by VARCHAR(50)`,
    `ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'MRU'`,
    `ALTER TABLE owners ADD COLUMN IF NOT EXISTS secondary_role_name VARCHAR(50)`,
    `ALTER TABLE salaries ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending'`,
    `ALTER TABLE employees ADD COLUMN IF NOT EXISTS allowances DECIMAL(15,2) DEFAULT 0`,
    `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS total_hours DECIMAL(5,2) DEFAULT 0`,
    `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS notes TEXT`,
    `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`,
    `ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS hour_slot INT`,
    `ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS status VARCHAR(30)`,
    `ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS device VARCHAR(200)`,
    `ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS location VARCHAR(200)`,
    `ALTER TABLE leaves ADD COLUMN IF NOT EXISTS total_days INT`,
    `ALTER TABLE leaves ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`,
    `ALTER TABLE votes ADD COLUMN IF NOT EXISTS type VARCHAR(50)`,
    `ALTER TABLE vote_options ADD COLUMN IF NOT EXISTS option_text VARCHAR(300)`,
    `ALTER TABLE vote_options ADD COLUMN IF NOT EXISTS weighted_percentage DECIMAL(7,4) DEFAULT 0`,
    `ALTER TABLE user_votes ADD COLUMN IF NOT EXISTS shares_weight INT DEFAULT 100`,
    `ALTER TABLE share_transactions ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(30) DEFAULT 'transfer'`,
    `ALTER TABLE share_transactions ADD COLUMN IF NOT EXISTS total_value DECIMAL(15,2) DEFAULT 0`,
    `ALTER TABLE share_transactions ADD COLUMN IF NOT EXISTS notes TEXT`,
    `ALTER TABLE share_transactions ADD COLUMN IF NOT EXISTS approved_by INT`,
    `ALTER TABLE share_transactions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`,
    `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS type VARCHAR(50)`,
    `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS start_time TIME`,
    `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS end_time TIME`,
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_id INT`,
    `ALTER TABLE files ADD COLUMN IF NOT EXISTS type VARCHAR(100)`,
    `ALTER TABLE file_versions ADD COLUMN IF NOT EXISTS content_snapshot TEXT`,
    `ALTER TABLE file_versions ADD COLUMN IF NOT EXISTS change_note TEXT`,
    `ALTER TABLE file_versions ADD COLUMN IF NOT EXISTS is_rollback BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE position_requests ADD COLUMN IF NOT EXISTS user_id INT`,
    `ALTER TABLE position_requests ADD COLUMN IF NOT EXISTS requested_role_name VARCHAR(100)`,
    `ALTER TABLE position_requests ADD COLUMN IF NOT EXISTS reason TEXT`,
    `ALTER TABLE position_requests ADD COLUMN IF NOT EXISTS approved_by INT`,
    `ALTER TABLE position_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`,
    `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS title VARCHAR(300)`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor VARCHAR(200)`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approval_threshold DECIMAL(15,2) DEFAULT 0`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by INT`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`,
    `ALTER TABLE revenues ADD COLUMN IF NOT EXISTS title VARCHAR(300)`,
    `ALTER TABLE revenues ADD COLUMN IF NOT EXISTS type VARCHAR(100)`,
    `ALTER TABLE revenues ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100)`,
    `ALTER TABLE revenues ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'`,
    `ALTER TABLE revenues ADD COLUMN IF NOT EXISTS created_by INT`,
    `ALTER TABLE deduction_proposals ADD COLUMN IF NOT EXISTS type VARCHAR(30) DEFAULT 'deduction'`,
    `ALTER TABLE deduction_proposals ADD COLUMN IF NOT EXISTS approved_by INT`,
    `ALTER TABLE deduction_proposals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`,
    `ALTER TABLE shares ADD COLUMN IF NOT EXISTS total_shares INT DEFAULT 0`,
    `ALTER TABLE shares ADD COLUMN IF NOT EXISTS ownership_percentage DECIMAL(7,4) DEFAULT 0`,
    `ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS owner_id INT`,
    `ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS amount DECIMAL(15,2) DEFAULT 0`,
    `ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS owner_percentage DECIMAL(7,4) DEFAULT 0`,
    `ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending'`,
  ];

  let ok = 0, fail = 0;
  for (const s of stmts) {
    try {
      await pool.query(s);
      ok++;
    } catch (e) {
      fail++;
      console.error(`FAIL: ${e.message.substring(0, 100)}`);
    }
  }
  console.log(`Done: ${ok} OK, ${fail} failed`);
  await pool.end();
}
fix().catch(e => { console.error(e); process.exit(1); });
