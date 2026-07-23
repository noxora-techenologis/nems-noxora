import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Seed data definitions matching our DBD schema
const INITIAL_SEED = {
  roles: [
    { role_id: 1, role_name: 'Admin', description: 'مدير النظام - صلاحيات تقنية كاملة', dashboard_type: 'admin', sidebar_modules: ['dashboard', 'users', 'settings', 'logs'] },
    { role_id: 2, role_name: 'CEO', description: 'المدير العام - صلاحيات إدارية كاملة', dashboard_type: 'ceo', sidebar_modules: ['dashboard', 'employees', 'attendance', 'projects', 'clients', 'finance', 'owners', 'meetings', 'documents', 'messages', 'reports', 'settings'] },
    { role_id: 3, role_name: 'FM', description: 'المدير المالي - إدارة الحسابات والرواتب', dashboard_type: 'fm', sidebar_modules: ['dashboard', 'finance', 'clients', 'employees', 'reports', 'meetings'] },
    { role_id: 4, role_name: 'HR', description: 'مدير الموارد البشرية - الموظفون والدوام', dashboard_type: 'hr', sidebar_modules: ['dashboard', 'employees', 'attendance', 'meetings', 'reports'] },
    { role_id: 5, role_name: 'PM', description: 'مدير المشروع - إدارة المشاريع والمهام', dashboard_type: 'pm', sidebar_modules: ['dashboard', 'projects', 'clients', 'meetings', 'documents'] },
    { role_id: 6, role_name: 'Employee', description: 'موظف - الدوام والمهام الشخصية', dashboard_type: 'employee', sidebar_modules: ['dashboard', 'attendance', 'projects', 'meetings', 'documents', 'messages'] },
    { role_id: 7, role_name: 'Owner', description: 'مالك وشريك - الأسهم والتصويت والأرباح', dashboard_type: 'owner', sidebar_modules: ['dashboard', 'owners', 'reports'] }
  ],
  users: [
    { user_id: 1, name: 'مدير النظام التقني', email: 'admin@noxora.com', password_hash: 'admin123', phone: '0500000001', role_id: 1, status: 'active', avatar: '', last_login: '2026-07-21 12:00:00', created_at: '2026-01-01 08:00:00' }
  ],
  departments: [
    { department_id: 1, name: 'الإدارة العليا', name_en: 'Management', manager_id: null, parent_department_id: null, created_at: '2026-01-01 08:00:00' }
  ],
  employees: [],
  projects: [],
  tasks: [],
  attendance: [],
  attendance_logs: [],
  leaves: [],
  salaries: [],
  deduction_proposals: [],
  clients: [],
  revenues: [],
  expenses: [],
  budgets: [],
  owners: [],
  position_requests: [],
  shares: [],
  share_transactions: [],
  profit_distributions: [],
  votes: [],
  vote_options: [],
  user_votes: [],
  meetings: [],
  meeting_attendees: [],
  conversations: [],
  conversation_members: [],
  messages: [],
  files: [],
  project_documents: [],
  file_versions: [],
  announcements: [],
  notifications: [],
  system_settings: [
    { setting_id: 1, key: 'company_name', value: 'شركة نوكسورا للتقنية', type: 'string', category: 'company', label_ar: 'اسم الشركة الرسمي', label_en: 'Company Name', updated_by: 1, updated_at: '2026-07-21 12:00:00' },
    { setting_id: 2, key: 'primary_color', value: '#C0392B', type: 'string', category: 'appearance', label_ar: 'اللون الأساسي للشركة (أحمر)', label_en: 'Primary Color (Red)', updated_by: 1, updated_at: '2026-07-21 12:00:00' },
    { setting_id: 3, key: 'secondary_color', value: '#F39C12', type: 'string', category: 'appearance', label_ar: 'اللون الثانوي للشركة (أصفر)', label_en: 'Secondary Color (Yellow)', updated_by: 1, updated_at: '2026-07-21 12:00:00' },
    { setting_id: 4, key: 'company_initial_assets_valuation', value: '1000000', type: 'number', category: 'company', label_ar: 'التقييم الأولي لممتلكات وأصول الشركة (أوقية / MRU)', label_en: 'Company Assets Valuation', updated_by: 1, updated_at: '2026-07-21 12:00:00' },
    { setting_id: 5, key: 'company_total_shares', value: '1000', type: 'number', category: 'company', label_ar: 'إجمالي أسهم الشركة التأسيسية القابلة للتوزيع', label_en: 'Total Company Base Shares', updated_by: 1, updated_at: '2026-07-21 12:00:00' },
    { setting_id: 6, key: 'shares_setup_completed', value: 'false', type: 'boolean', category: 'company', label_ar: 'تم قفل تخصيص الأسهم التأسيسية الأولية', label_en: 'Initial Shares Setup Completed', updated_by: 1, updated_at: '2026-07-21 12:00:00' },
    { setting_id: 7, key: 'work_start_time', value: '08:00', type: 'string', category: 'attendance', label_ar: 'وقت بدء الدوام الرسمي', label_en: 'Official Work Start Time', updated_by: 1, updated_at: '2026-07-21 12:00:00' },
    { setting_id: 8, key: 'work_end_time', value: '17:00', type: 'string', category: 'attendance', label_ar: 'وقت نهاية الدوام الرسمي', label_en: 'Official Work End Time', updated_by: 1, updated_at: '2026-07-21 12:00:00' },
    { setting_id: 9, key: 'hourly_checkins_required', value: '8', type: 'number', category: 'attendance', label_ar: 'عدد البصمات الساعية المطلوبة يومياً', label_en: 'Hourly Check-ins Required Daily', updated_by: 1, updated_at: '2026-07-21 12:00:00' },
    { setting_id: 10, key: 'late_tolerance_minutes', value: '15', type: 'number', category: 'attendance', label_ar: 'فترة السماح للتأخر (دقائق)', label_en: 'Late Tolerance Period (Minutes)', updated_by: 1, updated_at: '2026-07-21 12:00:00' }
  ],
  feedback_reports: [],
  audit_log: [
    { log_id: 1, user_id: 1, user_name: 'System Admin', action: 'system_cleaned', module: 'System', entity_type: 'database', entity_id: 'NEMS_PROD_DB', old_value: null, new_value: { status: 'production_ready' }, ip_address: '127.0.0.1', device: '💻 server-init', timestamp: '2026-07-21 12:00:00' }
  ]
};

// Database connection configuration
const pgConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false
};

// Allowed table names for SQL injection protection
const SAFE_TABLES = new Set([
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

function validateTableName(table) {
  if (!SAFE_TABLES.has(table)) {
    throw new Error(`Access denied to table: "${table}"`);
  }
  return table;
}

let pool = null;
let usePostgres = false;

// Check if PostgreSQL environment variables are configured
if (process.env.DATABASE_URL || process.env.PGHOST) {
  try {
    pool = new Pool(pgConfig);
    pool.on('error', (err) => {
      console.error('NEMS Database: Pool error (idle client).', err.message);
    });
    usePostgres = true;
    console.log('NEMS Database: Connected to PostgreSQL database.');
  } catch (err) {
    console.error('NEMS Database: Failed to connect to PostgreSQL. Falling back to JSON file database.', err);
    usePostgres = false;
  }
}

// JSON file database paths (local development only)
const JSON_DB_DIR = path.join(process.cwd(), 'src', 'data');
const JSON_DB_FILE = path.join(JSON_DB_DIR, 'db.json');

// Initialize local JSON database directory and file if it does not exist
function initJsonDatabase() {
  try {
    if (!fs.existsSync(JSON_DB_DIR)) {
      fs.mkdirSync(JSON_DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(JSON_DB_FILE)) {
      fs.writeFileSync(JSON_DB_FILE, JSON.stringify(INITIAL_SEED, null, 2), 'utf-8');
      console.log('NEMS Database: Initialized local JSON database file.');
    }
  } catch (err) {
    console.error('NEMS Database: Cannot initialize JSON file (read-only filesystem). PostgreSQL required.', err.message);
  }
}

if (!usePostgres) {
  initJsonDatabase();
}

function requirePostgres(operation) {
  if (!usePostgres) {
    throw new Error(
      `EROFS: ${operation} failed — Vercel filesystem is read-only. ` +
      `Set DATABASE_URL environment variable to connect to PostgreSQL.`
    );
  }
}

// Helper to query the active database engine
export async function query(text, params = []) {
  if (usePostgres) {
    const res = await pool.query(text, params);
    return res.rows;
  }
  throw new Error(
    `No database configured. Set DATABASE_URL to connect to PostgreSQL.`
  );
}

// Specific CRUD API for Next.js API Routes (acting as an ORM layer)
export async function getTable(table) {
  validateTableName(table);
  if (usePostgres) {
    const res = await pool.query(`SELECT * FROM ${table}`);
    return res.rows;
  }
  throw new Error(
    `No database configured. Set DATABASE_URL to connect to PostgreSQL.`
  );
}

export async function saveTable(table, data) {
  validateTableName(table);
  requirePostgres(`saveTable(${table})`);
  // PostgreSQL transactions: truncate and bulk re-insert for state syncing
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`TRUNCATE TABLE ${table} CASCADE`);
    for (const row of data) {
      const keys = Object.keys(row);
      const values = Object.values(row);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      await client.query(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
        values
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return true;
}

export async function insertRecord(table, record, userId = 1) {
  validateTableName(table);
  requirePostgres(`insertRecord(${table})`);

  record.created_at = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const keys = Object.keys(record);
  const values = Object.values(record);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const res = await pool.query(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  const inserted = res.rows[0];

  // Log to audit log (fire and forget)
  auditLog(userId, 'create', getModuleForTable(table), table, inserted[getPrimaryKeyField(table)] || 'N/A', null, inserted).catch(() => {});

  return inserted;
}

export async function updateRecord(table, idValue, updatedFields, userId = 1) {
  validateTableName(table);
  requirePostgres(`updateRecord(${table})`);

  const idKey = getPrimaryKeyField(table);
  updatedFields.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const keys = Object.keys(updatedFields);
  const values = Object.values(updatedFields);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

  const res = await pool.query(
    `UPDATE ${table} SET ${setClause} WHERE ${idKey} = $${keys.length + 1} RETURNING *`,
    [...values, idValue]
  );

  if (res.rowCount === 0) return false;

  const newRecord = res.rows[0];
  auditLog(userId, 'update', getModuleForTable(table), table, idValue, null, newRecord).catch(() => {});

  return newRecord;
}

export async function deleteRecord(table, idValue, userId = 1) {
  validateTableName(table);
  requirePostgres(`deleteRecord(${table})`);

  const idKey = getPrimaryKeyField(table);
  const res = await pool.query(
    `DELETE FROM ${table} WHERE ${idKey} = $1 RETURNING *`,
    [idValue]
  );

  if (res.rowCount === 0) return false;

  auditLog(userId, 'delete', getModuleForTable(table), table, idValue, res.rows[0], null).catch(() => {});

  return true;
}

export async function auditLog(userId, action, module, entityType, entityId, oldValue, newValue) {
  try {
    requirePostgres('auditLog');
    const users = await getTable('users');
    const user = users.find(u => u.user_id === userId) || { name: 'زائر / نظام' };

    await pool.query(
      `INSERT INTO audit_log (user_id, user_name, action, module, entity_type, entity_id, old_value, new_value, ip_address, device, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId,
        user.name,
        action,
        module,
        entityType,
        String(entityId),
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        '127.0.0.1',
        '💻 Server API',
        new Date().toISOString().replace('T', ' ').substring(0, 19)
      ]
    );
  } catch {
    // Audit log should not break the main operation
  }
}

function getPrimaryKeyField(table) {
  const primaryKeys = {
    users: 'user_id',
    roles: 'role_id',
    permissions: 'permission_id',
    role_permissions: 'id',
    employees: 'employee_id',
    departments: 'department_id',
    projects: 'project_id',
    tasks: 'task_id',
    attendance: 'attendance_id',
    attendance_logs: 'log_id',
    leaves: 'leave_id',
    salaries: 'salary_id',
    deduction_proposals: 'deduction_id',
    clients: 'client_id',
    revenues: 'revenue_id',
    expenses: 'expense_id',
    budgets: 'budget_id',
    owners: 'owner_id',
    position_requests: 'request_id',
    shares: 'share_id',
    share_transactions: 'transaction_id',
    profit_distributions: 'distribution_id',
    votes: 'vote_id',
    vote_options: 'option_id',
    user_votes: 'id',
    meetings: 'meeting_id',
    meeting_attendees: 'id',
    conversations: 'conversation_id',
    conversation_members: 'id',
    messages: 'message_id',
    files: 'file_id',
    project_documents: 'id',
    file_versions: 'version_id',
    announcements: 'announcement_id',
    notifications: 'notification_id',
    feedback_reports: 'id',
    audit_log: 'log_id',
    system_settings: 'setting_id'
  };
  return primaryKeys[table] || null;
}

function getModuleForTable(table) {
  const modules = {
    users: 'Users',
    roles: 'Users',
    permissions: 'System',
    role_permissions: 'System',
    employees: 'HR',
    departments: 'HR',
    projects: 'Projects',
    tasks: 'Projects',
    attendance: 'Attendance',
    attendance_logs: 'Attendance',
    leaves: 'HR',
    salaries: 'Finance',
    deduction_proposals: 'Finance',
    clients: 'Projects',
    revenues: 'Finance',
    expenses: 'Finance',
    budgets: 'Finance',
    owners: 'Shares',
    shares: 'Shares',
    share_transactions: 'Shares',
    profit_distributions: 'Shares',
    votes: 'Governance',
    vote_options: 'Governance',
    user_votes: 'Governance',
    meetings: 'Collaboration',
    meeting_attendees: 'Collaboration',
    conversations: 'Collaboration',
    conversation_members: 'Collaboration',
    messages: 'Collaboration',
    files: 'Documents',
    project_documents: 'Documents',
    file_versions: 'Documents',
    announcements: 'Collaboration',
    notifications: 'System',
    feedback_reports: 'System',
    audit_log: 'System',
    system_settings: 'System'
  };
  return modules[table] || 'System';
}
