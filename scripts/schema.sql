-- NEMS Database Schema for PostgreSQL (Neon)
-- Updated: All columns match frontend modules

CREATE TABLE IF NOT EXISTS roles (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL,
  description TEXT,
  dashboard_type VARCHAR(50),
  sidebar_modules JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  role_id INT REFERENCES roles(role_id),
  status VARCHAR(20) DEFAULT 'active',
  avatar TEXT,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
  department_id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  name_en VARCHAR(150),
  manager_id INT,
  parent_department_id INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
  employee_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  name VARCHAR(150) NOT NULL,
  job_title VARCHAR(100),
  department_id INT REFERENCES departments(department_id),
  hire_date DATE,
  salary DECIMAL(15,2),
  basic_salary DECIMAL(15,2),
  allowances DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  employment_status VARCHAR(20) DEFAULT 'active',
  phone VARCHAR(30),
  email VARCHAR(200),
  nationality VARCHAR(100),
  gender VARCHAR(20),
  national_id VARCHAR(50),
  contract_type VARCHAR(50),
  address TEXT,
  emergency_contact VARCHAR(30),
  emergency_name VARCHAR(150),
  emergency_relation VARCHAR(50),
  epi_score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  project_id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(30) DEFAULT 'active',
  priority VARCHAR(20) DEFAULT 'medium',
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15,2),
  spent DECIMAL(15,2) DEFAULT 0,
  progress INT DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'MRU',
  health_score INT DEFAULT 100,
  owner_id INT,
  client_id INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  task_id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(project_id),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  status VARCHAR(30) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  assigned_to INT REFERENCES employees(employee_id),
  assigned_by VARCHAR(50),
  due_date DATE,
  deadline DATE,
  completion_percentage INT DEFAULT 0,
  estimated_hours DECIMAL(5,2) DEFAULT 0,
  actual_hours DECIMAL(5,2) DEFAULT 0,
  required_proof VARCHAR(30) DEFAULT 'none',
  attached_media JSONB,
  proof_submitted JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
  attendance_id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(employee_id),
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status VARCHAR(20) DEFAULT 'present',
  hours_worked DECIMAL(5,2),
  total_hours DECIMAL(5,2) DEFAULT 0,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  is_late BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  log_id SERIAL PRIMARY KEY,
  attendance_id INT REFERENCES attendance(attendance_id),
  employee_id INT REFERENCES employees(employee_id),
  action VARCHAR(30),
  hour_slot INT,
  status VARCHAR(30),
  device VARCHAR(200),
  location VARCHAR(200),
  timestamp TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leaves (
  leave_id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(employee_id),
  type VARCHAR(30),
  start_date DATE,
  end_date DATE,
  days INT,
  total_days INT,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  approved_by INT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS salaries (
  salary_id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(employee_id),
  month VARCHAR(10),
  year INT,
  base_salary DECIMAL(15,2),
  allowances DECIMAL(15,2) DEFAULT 0,
  deductions DECIMAL(15,2) DEFAULT 0,
  bonus DECIMAL(15,2) DEFAULT 0,
  net_salary DECIMAL(15,2),
  currency VARCHAR(10) DEFAULT 'MRU',
  status VARCHAR(20) DEFAULT 'pending',
  payment_status VARCHAR(20) DEFAULT 'pending',
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deduction_proposals (
  deduction_id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(employee_id),
  proposed_by INT REFERENCES users(user_id),
  amount DECIMAL(15,2),
  reason TEXT,
  type VARCHAR(30) DEFAULT 'deduction',
  status VARCHAR(20) DEFAULT 'pending',
  approved_by INT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  client_id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(30),
  company VARCHAR(200),
  address TEXT,
  country VARCHAR(100),
  value_score INT DEFAULT 0,
  communication_log JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS revenues (
  revenue_id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(project_id),
  client_id INT REFERENCES clients(client_id),
  amount DECIMAL(15,2) NOT NULL,
  title VARCHAR(300),
  type VARCHAR(100),
  currency VARCHAR(10) DEFAULT 'MRU',
  description TEXT,
  payment_method VARCHAR(100),
  date DATE,
  category VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  created_by INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
  expense_id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(project_id),
  amount DECIMAL(15,2) NOT NULL,
  title VARCHAR(300),
  vendor VARCHAR(200),
  currency VARCHAR(10) DEFAULT 'MRU',
  description TEXT,
  category VARCHAR(100),
  date DATE,
  approved_by INT,
  status VARCHAR(20) DEFAULT 'pending',
  approval_threshold DECIMAL(15,2) DEFAULT 0,
  created_by INT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budgets (
  budget_id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(project_id),
  allocated DECIMAL(15,2),
  spent DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'MRU',
  fiscal_year INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS owners (
  owner_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(30),
  total_shares INT DEFAULT 0,
  share_percentage DECIMAL(7,4) DEFAULT 0,
  secondary_role_name VARCHAR(50),
  join_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS position_requests (
  request_id SERIAL PRIMARY KEY,
  owner_id INT REFERENCES owners(owner_id),
  user_id INT,
  position VARCHAR(100),
  requested_role_name VARCHAR(100),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  approved_by INT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shares (
  share_id SERIAL PRIMARY KEY,
  owner_id INT REFERENCES owners(owner_id),
  share_number INT,
  class VARCHAR(50) DEFAULT 'common',
  total_shares INT DEFAULT 0,
  ownership_percentage DECIMAL(7,4) DEFAULT 0,
  issue_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS share_transactions (
  transaction_id SERIAL PRIMARY KEY,
  from_owner_id INT,
  to_owner_id INT,
  shares_count INT,
  transaction_type VARCHAR(30) DEFAULT 'transfer',
  price_per_share DECIMAL(15,2),
  total_amount DECIMAL(15,2),
  total_value DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'completed',
  approved_by INT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profit_distributions (
  distribution_id SERIAL PRIMARY KEY,
  owner_id INT,
  period VARCHAR(50),
  amount DECIMAL(15,2) DEFAULT 0,
  owner_percentage DECIMAL(7,4) DEFAULT 0,
  total_amount DECIMAL(15,2),
  currency VARCHAR(10) DEFAULT 'MRU',
  payment_status VARCHAR(20) DEFAULT 'pending',
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS votes (
  vote_id SERIAL PRIMARY KEY,
  title VARCHAR(300),
  description TEXT,
  type VARCHAR(50),
  created_by INT REFERENCES users(user_id),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  weight_by_shares BOOLEAN DEFAULT FALSE,
  winner_option_id INT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vote_options (
  option_id SERIAL PRIMARY KEY,
  vote_id INT REFERENCES votes(vote_id),
  text VARCHAR(300),
  option_text VARCHAR(300),
  votes_count INT DEFAULT 0,
  weighted_percentage DECIMAL(7,4) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_votes (
  id SERIAL PRIMARY KEY,
  vote_id INT REFERENCES votes(vote_id),
  option_id INT REFERENCES vote_options(option_id),
  user_id INT REFERENCES users(user_id),
  shares_weight INT DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meetings (
  meeting_id SERIAL PRIMARY KEY,
  title VARCHAR(300),
  description TEXT,
  type VARCHAR(50),
  project_id INT,
  date TIMESTAMP,
  start_time TIME,
  end_time TIME,
  duration_minutes INT,
  organizer_id INT REFERENCES users(user_id),
  status VARCHAR(20) DEFAULT 'scheduled',
  location VARCHAR(200),
  agenda TEXT,
  minutes TEXT,
  decisions TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meeting_attendees (
  id SERIAL PRIMARY KEY,
  meeting_id INT REFERENCES meetings(meeting_id),
  user_id INT REFERENCES users(user_id),
  status VARCHAR(20) DEFAULT 'invited',
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
  conversation_id SERIAL PRIMARY KEY,
  name VARCHAR(200),
  type VARCHAR(30),
  created_by INT REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_members (
  id SERIAL PRIMARY KEY,
  conversation_id INT REFERENCES conversations(conversation_id),
  user_id INT REFERENCES users(user_id),
  role VARCHAR(20) DEFAULT 'member',
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  message_id SERIAL PRIMARY KEY,
  conversation_id INT REFERENCES conversations(conversation_id),
  sender_id INT REFERENCES users(user_id),
  receiver_id INT,
  content TEXT,
  message_text TEXT,
  file_id INT,
  is_read BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS files (
  file_id SERIAL PRIMARY KEY,
  name VARCHAR(300),
  original_name VARCHAR(300),
  mime_type VARCHAR(100),
  type VARCHAR(100),
  size INT,
  path TEXT,
  category VARCHAR(100),
  department_id INT,
  project_id INT,
  confidentiality VARCHAR(30) DEFAULT 'internal',
  current_version INT DEFAULT 1,
  uploaded_by INT REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_documents (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(project_id),
  file_id INT REFERENCES files(file_id),
  category VARCHAR(100),
  uploaded_by INT REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS file_versions (
  version_id SERIAL PRIMARY KEY,
  file_id INT REFERENCES files(file_id),
  version_number INT,
  path TEXT,
  content_snapshot TEXT,
  change_note TEXT,
  is_rollback BOOLEAN DEFAULT FALSE,
  uploaded_by INT REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
  announcement_id SERIAL PRIMARY KEY,
  title VARCHAR(300),
  content TEXT,
  priority VARCHAR(20) DEFAULT 'normal',
  target_roles JSONB DEFAULT '[]'::jsonb,
  expires_at TIMESTAMP,
  created_by INT REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  title VARCHAR(300),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback_reports (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  type VARCHAR(50),
  title VARCHAR(300),
  description TEXT,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
  log_id SERIAL PRIMARY KEY,
  user_id INT,
  user_name VARCHAR(200),
  action VARCHAR(50),
  module VARCHAR(100),
  entity_type VARCHAR(100),
  entity_id VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(50),
  device VARCHAR(200),
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  setting_id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  type VARCHAR(20) DEFAULT 'string',
  category VARCHAR(50),
  label_ar TEXT,
  label_en TEXT,
  updated_by INT REFERENCES users(user_id),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  permission_id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  description TEXT,
  module VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INT REFERENCES roles(role_id),
  permission_id INT REFERENCES permissions(permission_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
