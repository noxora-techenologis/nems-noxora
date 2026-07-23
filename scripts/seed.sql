-- NEMS Seed Data for PostgreSQL
-- Run AFTER schema.sql

-- Roles
INSERT INTO roles (role_id, role_name, description, dashboard_type, sidebar_modules) VALUES
(1, 'Admin', 'مدير النظام - صلاحيات تقنية كاملة', 'admin', '["dashboard","users","settings","logs"]'),
(2, 'CEO', 'المدير العام - صلاحيات إدارية كاملة', 'ceo', '["dashboard","employees","attendance","projects","clients","finance","owners","meetings","documents","messages","reports","settings"]'),
(3, 'FM', 'المدير المالي - إدارة الحسابات والرواتب', 'fm', '["dashboard","finance","clients","employees","reports","meetings"]'),
(4, 'HR', 'مدير الموارد البشرية - الموظفون والدوام', 'hr', '["dashboard","employees","attendance","meetings","reports"]'),
(5, 'PM', 'مدير المشروع - إدارة المشاريع والمهام', 'pm', '["dashboard","projects","clients","meetings","documents"]'),
(6, 'Employee', 'موظف - الدوام والمهام الشخصية', 'employee', '["dashboard","attendance","projects","meetings","documents","messages"]'),
(7, 'Owner', 'مالك وشريك - الأسهم والتصويت والأرباح', 'owner', '["dashboard","owners","reports"]')
ON CONFLICT (role_id) DO NOTHING;

-- Departments
INSERT INTO departments (department_id, name, name_en, manager_id, parent_department_id) VALUES
(1, 'الإدارة العليا', 'Management', NULL, NULL)
ON CONFLICT (department_id) DO NOTHING;

-- Users (admin only)
INSERT INTO users (user_id, name, email, password_hash, phone, role_id, status, avatar, last_login, created_at) VALUES
(1, 'مدير النظام التقني', 'admin@noxora.com', 'admin123', '0500000001', 1, 'active', '', '2026-07-21 12:00:00', '2026-01-01 08:00:00')
ON CONFLICT (user_id) DO NOTHING;

-- System Settings
INSERT INTO system_settings (setting_id, key, value, type, category, label_ar, label_en, updated_by, updated_at) VALUES
(1, 'company_name', 'شركة نوكسورا للتقنية', 'string', 'company', 'اسم الشركة الرسمي', 'Company Name', 1, '2026-07-21 12:00:00'),
(2, 'primary_color', '#C0392B', 'string', 'appearance', 'اللون الأساسي للشركة (أحمر)', 'Primary Color (Red)', 1, '2026-07-21 12:00:00'),
(3, 'secondary_color', '#F39C12', 'string', 'appearance', 'اللون الثانوي للشركة (أصفر)', 'Secondary Color (Yellow)', 1, '2026-07-21 12:00:00'),
(4, 'company_initial_assets_valuation', '1000000', 'number', 'company', 'التقييم الأولي لممتلكات وأصول الشركة (أوقية / MRU)', 'Company Assets Valuation', 1, '2026-07-21 12:00:00'),
(5, 'company_total_shares', '1000', 'number', 'company', 'إجمالي أسهم الشركة التأسيسية القابلة للتوزيع', 'Total Company Base Shares', 1, '2026-07-21 12:00:00'),
(6, 'shares_setup_completed', 'false', 'boolean', 'company', 'تم قفل تخصيص الأسهم التأسيسية الأولية', 'Initial Shares Setup Completed', 1, '2026-07-21 12:00:00'),
(7, 'work_start_time', '08:00', 'string', 'attendance', 'وقت بدء الدوام الرسمي', 'Official Work Start Time', 1, '2026-07-21 12:00:00'),
(8, 'work_end_time', '17:00', 'string', 'attendance', 'وقت نهاية الدوام الرسمي', 'Official Work End Time', 1, '2026-07-21 12:00:00'),
(9, 'hourly_checkins_required', '8', 'number', 'attendance', 'عدد البصمات الساعية المطلوبة يومياً', 'Hourly Check-ins Required Daily', 1, '2026-07-21 12:00:00'),
(10, 'late_tolerance_minutes', '15', 'number', 'attendance', 'فترة السماح للتأخر (دقائق)', 'Late Tolerance Period (Minutes)', 1, '2026-07-21 12:00:00')
ON CONFLICT (setting_id) DO NOTHING;

-- Audit Log
INSERT INTO audit_log (log_id, user_id, user_name, action, module, entity_type, entity_id, old_value, new_value, ip_address, device, timestamp) VALUES
(1, 1, 'System Admin', 'system_cleaned', 'System', 'database', 'NEMS_PROD_DB', NULL, '{"status": "production_ready"}', '127.0.0.1', '💻 server-init', '2026-07-21 12:00:00')
ON CONFLICT (log_id) DO NOTHING;

-- Reset sequences
SELECT setval('roles_role_id_seq', (SELECT COALESCE(MAX(role_id), 1) FROM roles));
SELECT setval('users_user_id_seq', (SELECT COALESCE(MAX(user_id), 1) FROM users));
SELECT setval('departments_department_id_seq', (SELECT COALESCE(MAX(department_id), 1) FROM departments));
SELECT setval('system_settings_setting_id_seq', (SELECT COALESCE(MAX(setting_id), 1) FROM system_settings));
SELECT setval('audit_log_log_id_seq', (SELECT COALESCE(MAX(log_id), 1) FROM audit_log));
