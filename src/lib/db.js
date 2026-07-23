import { Pool } from 'pg';

// Database connection
const pgConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false
};

export const SAFE_TABLES = new Set([
  'users', 'roles', 'employees', 'departments', 'projects', 'tasks',
  'attendance', 'attendance_logs', 'leaves', 'salaries', 'deduction_proposals',
  'clients', 'revenues', 'expenses', 'budgets', 'owners', 'shares',
  'share_transactions', 'profit_distributions', 'votes', 'vote_options',
  'user_votes', 'meetings', 'meeting_attendees', 'conversations',
  'conversation_members', 'messages', 'files', 'project_documents',
  'file_versions', 'announcements', 'notifications', 'feedback_reports',
  'audit_log', 'system_settings', 'position_requests', 'permissions',
  'role_permissions'
]);

const PRIMARY_KEYS = {
  users: 'user_id', roles: 'role_id', employees: 'employee_id',
  departments: 'department_id', projects: 'project_id', tasks: 'task_id',
  attendance: 'attendance_id', attendance_logs: 'log_id', leaves: 'leave_id',
  salaries: 'salary_id', deduction_proposals: 'deduction_id', clients: 'client_id',
  revenues: 'revenue_id', expenses: 'expense_id', budgets: 'budget_id',
  owners: 'owner_id', shares: 'share_id', share_transactions: 'transaction_id',
  profit_distributions: 'distribution_id', votes: 'vote_id', vote_options: 'option_id',
  user_votes: 'id', meetings: 'meeting_id', meeting_attendees: 'id',
  conversations: 'conversation_id', conversation_members: 'id', messages: 'message_id',
  files: 'file_id', project_documents: 'id', file_versions: 'version_id',
  announcements: 'announcement_id', notifications: 'notification_id',
  feedback_reports: 'id', audit_log: 'log_id', system_settings: 'setting_id',
  position_requests: 'request_id', permissions: 'permission_id',
  role_permissions: 'id'
};

const MODULE_MAP = {
  users: 'Users', roles: 'Users', permissions: 'System', role_permissions: 'System',
  employees: 'HR', departments: 'HR', leaves: 'HR',
  projects: 'Projects', tasks: 'Projects', clients: 'Projects',
  attendance: 'Attendance', attendance_logs: 'Attendance',
  salaries: 'Finance', deduction_proposals: 'Finance', revenues: 'Finance',
  expenses: 'Finance', budgets: 'Finance',
  owners: 'Shares', shares: 'Shares', share_transactions: 'Shares', profit_distributions: 'Shares',
  votes: 'Governance', vote_options: 'Governance', user_votes: 'Governance',
  meetings: 'Collaboration', meeting_attendees: 'Collaboration',
  conversations: 'Collaboration', conversation_members: 'Collaboration', messages: 'Collaboration',
  announcements: 'Collaboration',
  files: 'Documents', project_documents: 'Documents', file_versions: 'Documents',
  notifications: 'System', feedback_reports: 'System', audit_log: 'System', system_settings: 'System'
};

let pool = null;
let usePostgres = false;

if (process.env.DATABASE_URL || process.env.PGHOST) {
  try {
    pool = new Pool(pgConfig);
    pool.on('error', (err) => {
      console.error('NEMS DB: Pool idle client error:', err.message);
    });
    usePostgres = true;
  } catch (err) {
    console.error('NEMS DB: PostgreSQL connection failed:', err.message);
  }
}

function validate(table) {
  if (!SAFE_TABLES.has(table)) throw new Error(`Access denied: "${table}"`);
  return table;
}

function pk(table) {
  const key = PRIMARY_KEYS[table];
  if (!key) throw new Error(`No primary key for table: "${table}"`);
  return key;
}

function q(table) {
  return `"${table}"`;
}

function now() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function serializeValue(v) {
  if (v === null || v === undefined) return v;
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function serializeValues(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, serializeValue(v)]));
}

// ─── Core Query ───
export async function query(text, params = []) {
  if (!usePostgres) throw new Error('DATABASE_URL not configured');
  const res = await pool.query(text, params);
  return res.rows;
}

// ─── Read ───
export async function getTable(table) {
  validate(table);
  if (!usePostgres) throw new Error('DATABASE_URL not configured');
  const res = await pool.query(`SELECT * FROM ${q(table)}`);
  return res.rows;
}

// ─── Insert ───
export async function insertRecord(table, record, userId = 1) {
  validate(table);
  if (!usePostgres) throw new Error('DATABASE_URL not configured');

  record.created_at = now();
  const safe = serializeValues(record);
  const keys = Object.keys(safe);
  const values = Object.values(safe);
  const cols = keys.map(k => `"${k}"`).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const res = await pool.query(
    `INSERT INTO ${q(table)} (${cols}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  const inserted = res.rows[0];

  auditLog(userId, 'create', MODULE_MAP[table] || 'System', table, inserted[pk(table)] || 'N/A', null, inserted).catch(() => {});

  return inserted;
}

// ─── Update ───
export async function updateRecord(table, idValue, updatedFields, userId = 1) {
  validate(table);
  if (!usePostgres) throw new Error('DATABASE_URL not configured');

  const idKey = pk(table);
  updatedFields.updated_at = now();

  const safe = serializeValues(updatedFields);
  const keys = Object.keys(safe);
  const values = Object.values(safe);
  const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');

  const res = await pool.query(
    `UPDATE ${q(table)} SET ${setClause} WHERE "${idKey}" = $${keys.length + 1} RETURNING *`,
    [...values, idValue]
  );

  if (res.rowCount === 0) return false;

  const newRecord = res.rows[0];
  auditLog(userId, 'update', MODULE_MAP[table] || 'System', table, idValue, null, newRecord).catch(() => {});

  return newRecord;
}

// ─── Delete ───
export async function deleteRecord(table, idValue, userId = 1) {
  validate(table);
  if (!usePostgres) throw new Error('DATABASE_URL not configured');

  const idKey = pk(table);
  const res = await pool.query(
    `DELETE FROM ${q(table)} WHERE "${idKey}" = $1 RETURNING *`,
    [idValue]
  );

  if (res.rowCount === 0) return false;

  auditLog(userId, 'delete', MODULE_MAP[table] || 'System', table, idValue, res.rows[0], null).catch(() => {});

  return true;
}

// ─── Audit Log (fire-and-forget) ───
export async function auditLog(userId, action, module, entityType, entityId, oldValue, newValue) {
  try {
    if (!usePostgres) return;

    let userName = 'نظام';
    if (userId && userId > 0) {
      const rows = await pool.query(`SELECT name FROM "users" WHERE "user_id" = $1 LIMIT 1`, [userId]);
      if (rows.rows.length > 0) userName = rows.rows[0].name;
    }

    await pool.query(
      `INSERT INTO "audit_log" ("user_id","user_name","action","module","entity_type","entity_id","old_value","new_value","ip_address","device","timestamp")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        userId || 0, userName, action || '', module || '',
        entityType || '', String(entityId || ''),
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        '127.0.0.1', '💻 Server API', now()
      ]
    );
  } catch {
    // Audit log must never break the main operation
  }
}
