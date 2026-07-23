const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  const tables = [
    'employees', 'attendance', 'attendance_logs', 'leaves', 'salaries',
    'deduction_proposals', 'clients', 'projects', 'tasks', 'revenues',
    'expenses', 'budgets', 'owners', 'shares', 'share_transactions',
    'profit_distributions', 'votes', 'vote_options', 'user_votes',
    'meetings', 'meeting_attendees', 'conversations', 'conversation_members',
    'messages', 'files', 'project_documents', 'file_versions',
    'announcements', 'notifications', 'feedback_reports', 'permissions',
    'role_permissions', 'position_requests', 'departments', 'users', 'roles',
    'system_settings'
  ];

  let ok = 0, fail = 0;
  for (const t of tables) {
    try {
      await pool.query(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`);
      ok++;
    } catch (e) {
      fail++;
      console.error(`FAIL ${t}: ${e.message.substring(0, 80)}`);
    }
  }
  console.log(`Done: ${ok} OK, ${fail} failed`);
  await pool.end();
}
fix().catch(e => { console.error(e); process.exit(1); });
