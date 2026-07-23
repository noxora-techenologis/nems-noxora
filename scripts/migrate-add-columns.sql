-- NEMS Migration: Add all missing columns to match frontend modules
-- Run against Neon PostgreSQL database

-- =============================================
-- employees
-- =============================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS allowances DECIMAL(15,2) DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS national_id VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_type VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(30);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_name VARCHAR(150);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_relation VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS epi_score INT DEFAULT 0;

-- =============================================
-- attendance
-- =============================================
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS total_hours DECIMAL(5,2) DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- =============================================
-- attendance_logs
-- =============================================
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS hour_slot INT;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS status VARCHAR(30);
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS device VARCHAR(200);
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS location VARCHAR(200);

-- =============================================
-- tasks
-- =============================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by VARCHAR(50);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_percentage INT DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2) DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(5,2) DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS required_proof VARCHAR(30) DEFAULT 'none';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attached_media JSONB;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS proof_submitted JSONB;

-- =============================================
-- projects
-- =============================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'MRU';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS health_score INT DEFAULT 100;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';

-- =============================================
-- leaves
-- =============================================
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS total_days INT;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- =============================================
-- revenues
-- =============================================
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS title VARCHAR(300);
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS type VARCHAR(100);
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100);
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS created_by INT;

-- =============================================
-- expenses
-- =============================================
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS title VARCHAR(300);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor VARCHAR(200);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approval_threshold DECIMAL(15,2) DEFAULT 0;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by INT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- =============================================
-- deduction_proposals
-- =============================================
ALTER TABLE deduction_proposals ADD COLUMN IF NOT EXISTS type VARCHAR(30) DEFAULT 'deduction';
ALTER TABLE deduction_proposals ADD COLUMN IF NOT EXISTS approved_by INT;
ALTER TABLE deduction_proposals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- =============================================
-- clients
-- =============================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS value_score INT DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS communication_log JSONB DEFAULT '[]'::jsonb;

-- =============================================
-- votes
-- =============================================
ALTER TABLE votes ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE votes ADD COLUMN IF NOT EXISTS weight_by_shares BOOLEAN DEFAULT FALSE;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS winner_option_id INT;

-- =============================================
-- vote_options
-- =============================================
ALTER TABLE vote_options ADD COLUMN IF NOT EXISTS option_text VARCHAR(300);
ALTER TABLE vote_options ADD COLUMN IF NOT EXISTS weighted_percentage DECIMAL(7,4) DEFAULT 0;

-- =============================================
-- user_votes
-- =============================================
ALTER TABLE user_votes ADD COLUMN IF NOT EXISTS shares_weight INT DEFAULT 100;

-- =============================================
-- share_transactions
-- =============================================
ALTER TABLE share_transactions ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(30) DEFAULT 'transfer';
ALTER TABLE share_transactions ADD COLUMN IF NOT EXISTS total_value DECIMAL(15,2) DEFAULT 0;
ALTER TABLE share_transactions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE share_transactions ADD COLUMN IF NOT EXISTS approved_by INT;
ALTER TABLE share_transactions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- =============================================
-- meetings
-- =============================================
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS project_id INT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS agenda TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS minutes TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS decisions TEXT;

-- =============================================
-- messages
-- =============================================
ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_id INT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_text TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_id INT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent';

-- =============================================
-- files
-- =============================================
ALTER TABLE files ADD COLUMN IF NOT EXISTS type VARCHAR(100);
ALTER TABLE files ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE files ADD COLUMN IF NOT EXISTS department_id INT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS project_id INT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS confidentiality VARCHAR(30) DEFAULT 'internal';
ALTER TABLE files ADD COLUMN IF NOT EXISTS current_version INT DEFAULT 1;

-- =============================================
-- file_versions
-- =============================================
ALTER TABLE file_versions ADD COLUMN IF NOT EXISTS content_snapshot TEXT;
ALTER TABLE file_versions ADD COLUMN IF NOT EXISTS change_note TEXT;
ALTER TABLE file_versions ADD COLUMN IF NOT EXISTS is_rollback BOOLEAN DEFAULT FALSE;

-- =============================================
-- salaries
-- =============================================
ALTER TABLE salaries ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';

-- =============================================
-- owners
-- =============================================
ALTER TABLE owners ADD COLUMN IF NOT EXISTS secondary_role_name VARCHAR(50);
ALTER TABLE owners ADD COLUMN IF NOT EXISTS join_date DATE;

-- =============================================
-- shares
-- =============================================
ALTER TABLE shares ADD COLUMN IF NOT EXISTS total_shares INT DEFAULT 0;
ALTER TABLE shares ADD COLUMN IF NOT EXISTS ownership_percentage DECIMAL(7,4) DEFAULT 0;

-- =============================================
-- position_requests
-- =============================================
ALTER TABLE position_requests ADD COLUMN IF NOT EXISTS user_id INT;
ALTER TABLE position_requests ADD COLUMN IF NOT EXISTS requested_role_name VARCHAR(100);
ALTER TABLE position_requests ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE position_requests ADD COLUMN IF NOT EXISTS approved_by INT;
ALTER TABLE position_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- =============================================
-- announcements
-- =============================================
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- =============================================
-- profit_distributions
-- =============================================
ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS owner_id INT;
ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS owner_percentage DECIMAL(7,4) DEFAULT 0;
ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';
