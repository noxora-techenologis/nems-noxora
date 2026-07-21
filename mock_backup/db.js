/**
 * NEMS - Noxora Enterprise Management System
 * Database Engine & Seed Data (LocalStorage Mock)
 * Version 1.0
 */

const NEMS_DB = {
  // Database Tables Prefix
  PREFIX: 'nems_',

  // Initial Seed Data
  seed: {
    roles: [
      { role_id: 1, role_name: 'Admin', description: 'مدير النظام - صلاحيات تقنية كاملة', dashboard_type: 'admin', sidebar_modules: ['dashboard', 'users', 'settings', 'logs'] },
      { role_id: 2, role_name: 'CEO', description: 'المدير العام - صلاحيات إدارية كاملة', dashboard_type: 'ceo', sidebar_modules: ['dashboard', 'employees', 'attendance', 'projects', 'finance', 'owners', 'meetings', 'documents', 'messages', 'reports', 'settings'] },
      { role_id: 3, role_name: 'FM', description: 'المدير المالي - إدارة الحسابات والرواتب', dashboard_type: 'fm', sidebar_modules: ['dashboard', 'finance', 'employees', 'reports', 'meetings'] },
      { role_id: 4, role_name: 'HR', description: 'مدير الموارد البشرية - الموظفون والدوام', dashboard_type: 'hr', sidebar_modules: ['dashboard', 'employees', 'attendance', 'meetings', 'reports'] },
      { role_id: 5, role_name: 'PM', description: 'مدير المشروع - إدارة المشاريع والمهام', dashboard_type: 'pm', sidebar_modules: ['dashboard', 'projects', 'meetings', 'documents'] },
      { role_id: 6, role_name: 'Employee', description: 'موظف - الدوام والمهام الشخصية', dashboard_type: 'employee', sidebar_modules: ['dashboard', 'attendance', 'projects', 'meetings', 'documents', 'messages'] },
      { role_id: 7, role_name: 'Owner', description: 'مالك وشريك - الأسهم والتصويت والأرباح', dashboard_type: 'owner', sidebar_modules: ['dashboard', 'owners', 'reports'] }
    ],

    permissions: [
      { permission_id: 1, name: 'عرض الموظفين', module: 'HR', action: 'view' },
      { permission_id: 2, name: 'إضافة موظف', module: 'HR', action: 'create' },
      { permission_id: 3, name: 'تعديل موظف', module: 'HR', action: 'edit' },
      { permission_id: 4, name: 'حذف موظف', module: 'HR', action: 'delete' },
      { permission_id: 5, name: 'اعتماد الإجازات والخصومات', module: 'HR', action: 'approve' },
      { permission_id: 6, name: 'عرض الإيرادات والمصروفات', module: 'Finance', action: 'view' },
      { permission_id: 7, name: 'إضافة معاملة مالية', module: 'Finance', action: 'create' },
      { permission_id: 8, name: 'تعديل معاملة مالية', module: 'Finance', action: 'edit' },
      { permission_id: 9, name: 'اعتماد المصروفات والرواتب', module: 'Finance', action: 'approve' },
      { permission_id: 10, name: 'عرض المشاريع', module: 'Projects', action: 'view' },
      { permission_id: 11, name: 'إنشاء مشروع', module: 'Projects', action: 'create' },
      { permission_id: 12, name: 'تعديل مشروع', module: 'Projects', action: 'edit' },
      { permission_id: 13, name: 'أرشفة مشروع', module: 'Projects', action: 'delete' },
      { permission_id: 14, name: 'عرض الأسهم والملاك', module: 'Shares', action: 'view' },
      { permission_id: 15, name: 'طلب نقل أسهم', module: 'Shares', action: 'create' },
      { permission_id: 16, name: 'اعتماد نقل أسهم', module: 'Shares', action: 'approve' },
      { permission_id: 17, name: 'إدارة الصلاحيات والإعدادات', module: 'System', action: 'approve' }
    ],

    role_permissions: [
      // Admin (All)
      { id: 1, role_id: 1, permission_id: 17, granted: true },
      // CEO (All except direct system admin config changes if restricted, but practically all)
      { id: 2, role_id: 2, permission_id: 1, granted: true },
      { id: 3, role_id: 2, permission_id: 2, granted: true },
      { id: 4, role_id: 2, permission_id: 3, granted: true },
      { id: 5, role_id: 2, permission_id: 4, granted: true },
      { id: 6, role_id: 2, permission_id: 5, granted: true },
      { id: 7, role_id: 2, permission_id: 6, granted: true },
      { id: 8, role_id: 2, permission_id: 7, granted: true },
      { id: 9, role_id: 2, permission_id: 8, granted: true },
      { id: 10, role_id: 2, permission_id: 9, granted: true },
      { id: 11, role_id: 2, permission_id: 10, granted: true },
      { id: 12, role_id: 2, permission_id: 11, granted: true },
      { id: 13, role_id: 2, permission_id: 12, granted: true },
      { id: 14, role_id: 2, permission_id: 13, granted: true },
      { id: 15, role_id: 2, permission_id: 14, granted: true },
      { id: 16, role_id: 2, permission_id: 15, granted: true },
      { id: 17, role_id: 2, permission_id: 16, granted: true },
      // FM (Finance Specialist)
      { id: 18, role_id: 3, permission_id: 6, granted: true },
      { id: 19, role_id: 3, permission_id: 7, granted: true },
      { id: 20, role_id: 3, permission_id: 8, granted: true },
      { id: 21, role_id: 3, permission_id: 9, granted: true },
      { id: 22, role_id: 3, permission_id: 1, granted: true }, // Can read employees for payroll
      // HR
      { id: 23, role_id: 4, permission_id: 1, granted: true },
      { id: 24, role_id: 4, permission_id: 2, granted: true },
      { id: 25, role_id: 4, permission_id: 3, granted: true },
      { id: 26, role_id: 4, permission_id: 5, granted: true },
      // PM
      { id: 27, role_id: 5, permission_id: 10, granted: true },
      { id: 28, role_id: 5, permission_id: 12, granted: true },
      // Employee
      { id: 29, role_id: 6, permission_id: 10, granted: true }, // view projects
      // Owner
      { id: 30, role_id: 7, permission_id: 14, granted: true },
      { id: 31, role_id: 7, permission_id: 15, granted: true }
    ],

    users: [
      { user_id: 1, name: 'مدير النظام التقني', email: 'admin@noxora.com', password_hash: 'admin123', phone: '0500000001', role_id: 1, status: 'active', avatar: '', last_login: '2026-07-20 12:00:00', created_at: '2026-01-01 08:00:00' },
      { user_id: 2, name: 'أحمد المنصوري', email: 'ceo@noxora.com', password_hash: 'ceo123', phone: '0500000002', role_id: 2, status: 'active', avatar: '', last_login: '2026-07-20 08:15:00', created_at: '2026-01-01 08:00:00' },
      { user_id: 3, name: 'ليلى الرشيدي', email: 'finance@noxora.com', password_hash: 'finance123', phone: '0500000003', role_id: 3, status: 'active', avatar: '', last_login: '2026-07-20 09:00:00', created_at: '2026-01-10 09:00:00' },
      { user_id: 4, name: 'عمر خالد', email: 'hr@noxora.com', password_hash: 'hr123', phone: '0500000004', role_id: 4, status: 'active', avatar: '', last_login: '2026-07-20 07:45:00', created_at: '2026-01-15 08:30:00' },
      { user_id: 5, name: 'سارة الزهراني', email: 'pm@noxora.com', password_hash: 'pm123', phone: '0500000005', role_id: 5, status: 'active', avatar: '', last_login: '2026-07-20 08:30:00', created_at: '2026-02-01 09:00:00' },
      { user_id: 6, name: 'خالد إبراهيم', email: 'emp@noxora.com', password_hash: 'emp123', phone: '0500000006', role_id: 6, status: 'active', avatar: '', last_login: '2026-07-20 08:02:00', created_at: '2026-02-15 08:00:00' },
      { user_id: 7, name: 'ناصر العتيبي', email: 'owner@noxora.com', password_hash: 'owner123', phone: '0500000007', role_id: 7, status: 'active', avatar: '', last_login: '2026-07-20 10:30:00', created_at: '2026-01-01 08:00:00' }
    ],

    departments: [
      { department_id: 1, name: 'الإدارة العليا', name_en: 'Management', manager_id: 2, parent_department_id: null, created_at: '2026-01-01 08:00:00' },
      { department_id: 2, name: 'التطوير والبرمجة', name_en: 'Engineering', manager_id: 5, parent_department_id: 1, created_at: '2026-01-01 08:00:00' },
      { department_id: 3, name: 'التصميم وتجربة المستخدم', name_en: 'Design', manager_id: 6, parent_department_id: 2, created_at: '2026-01-01 08:00:00' },
      { department_id: 4, name: 'المالية والمحاسبة', name_en: 'Finance', manager_id: 3, parent_department_id: 1, created_at: '2026-01-10 09:00:00' },
      { department_id: 5, name: 'الموارد البشرية', name_en: 'HR', manager_id: 4, parent_department_id: 1, created_at: '2026-01-15 08:30:00' },
      { department_id: 6, name: 'العمليات والتشغيل', name_en: 'Operations', manager_id: null, parent_department_id: 1, created_at: '2026-01-01 08:00:00' }
    ],

    employees: [
      { employee_id: 'EMP-001', user_id: 2, department_id: 1, job_title: 'المدير العام (CEO)', reports_to: null, basic_salary: 30000, allowances: 5000, hire_date: '2026-01-01', contract_type: 'Full-Time', employment_status: 'active', national_id: '1000000001', nationality: 'سعودي', gender: 'male', birth_date: '1985-05-15', address: 'الرياض، المملكة العربية السعودية', emergency_contact: '0501111111', epi_score: 95 },
      { employee_id: 'EMP-002', user_id: 3, department_id: 4, job_title: 'المدير المالي (CFO)', reports_to: 2, basic_salary: 20000, allowances: 3000, hire_date: '2026-01-10', contract_type: 'Full-Time', employment_status: 'active', national_id: '1000000002', nationality: 'سعودية', gender: 'female', birth_date: '1990-08-20', address: 'جدة، المملكة العربية السعودية', emergency_contact: '0502222222', emergency_name: 'أبو أحمد', emergency_relation: 'أب', epi_score: 92 },
      { employee_id: 'EMP-003', user_id: 4, department_id: 5, job_title: 'مدير الموارد البشرية', reports_to: 2, basic_salary: 15000, allowances: 2000, hire_date: '2026-01-15', contract_type: 'Full-Time', employment_status: 'active', national_id: '1000000003', nationality: 'سعودي', gender: 'male', birth_date: '1988-11-30', address: 'الرياض، المملكة العربية السعودية', emergency_contact: '0503333333', emergency_name: 'أم عمر', emergency_relation: 'زوجة', epi_score: 88 },
      { employee_id: 'EMP-004', user_id: 5, department_id: 2, job_title: 'مدير مشروع تطوير البرمجيات', reports_to: 2, basic_salary: 18000, allowances: 2500, hire_date: '2026-02-01', contract_type: 'Full-Time', employment_status: 'active', national_id: '1000000004', nationality: 'سعودية', gender: 'female', birth_date: '1992-04-12', address: 'الدمام، المملكة العربية السعودية', emergency_contact: '0504444444', emergency_name: 'أخو سارة', emergency_relation: 'أخ', epi_score: 90 },
      { employee_id: 'EMP-005', user_id: 6, department_id: 3, job_title: 'مصمم واجهات وتجربة مستخدم (UI/UX)', reports_to: 5, basic_salary: 12000, allowances: 1500, hire_date: '2026-02-15', contract_type: 'Full-Time', employment_status: 'active', national_id: '1000000005', nationality: 'سعودي', gender: 'male', birth_date: '1995-09-05', address: 'الرياض، المملكة العربية السعودية', emergency_contact: '0505555555', emergency_name: 'أبو خالد', emergency_relation: 'أب', epi_score: 85 }
    ],

    projects: [
      { project_id: 'PRJ-001', name: 'بناء نظام NEMS الداخلي', description: 'تطوير نظام NEMS المتكامل لإدارة الموارد والموظفين والمشاريع والأسهم لشركة نوكسورا.', client_id: 1, manager_id: 'EMP-004', type: 'داخلي', priority: 'critical', budget: 150000, currency: 'SAR', start_date: '2026-03-01', end_date: '2026-08-31', actual_end_date: null, status: 'active', progress: 65, health_score: 95, created_at: '2026-02-28 09:00:00' },
      { project_id: 'PRJ-002', name: 'الموقع الإلكتروني للشركة', description: 'تجديد وتصميم الموقع التعريفي الخارجي لشركة Noxora Technologies بأحدث المعايير البصرية.', client_id: 1, manager_id: 'EMP-004', type: 'داخلي', priority: 'medium', budget: 30000, currency: 'SAR', start_date: '2026-05-01', end_date: '2026-07-31', actual_end_date: null, status: 'active', progress: 90, health_score: 85, created_at: '2026-04-28 10:00:00' },
      { project_id: 'PRJ-003', name: 'تطبيق العميل الذكي لإنترنت الأشياء', description: 'مشروع خارجي لصالح شركة التقنية المتقدمة لبناء لوحة تحكم ذكية للأجهزة والشرائح الذكية.', client_id: 2, manager_id: 'EMP-004', type: 'خارجي', priority: 'high', budget: 250000, currency: 'SAR', start_date: '2026-06-01', end_date: '2026-12-31', actual_end_date: null, status: 'planning', progress: 10, health_score: 100, created_at: '2026-05-15 08:00:00' }
    ],

    tasks: [
      { task_id: 'TSK-001', project_id: 'PRJ-001', assigned_to: 'EMP-005', assigned_by: 'EMP-004', title: 'تصميم واجهات لوحة التحكم للملاك والموظفين', description: 'بناء النماذج الأولية والمخططات السلكية لشاشات لوحة الملاك والموظف مع محددات الحضور والأسهم.', priority: 'high', status: 'completed', start_date: '2026-03-05', deadline: '2026-03-25', estimated_hours: 40, actual_hours: 38, completion_percentage: 100, dependencies: [], is_recurring: false, recurrence_pattern: '', created_at: '2026-03-04 09:00:00' },
      { task_id: 'TSK-002', project_id: 'PRJ-001', assigned_to: 'EMP-005', assigned_by: 'EMP-004', title: 'بناء واجهات نظام الحضور الساعي والخصومات', description: 'برمجة واجهة شبكة الحضور ذات الـ 8 خانات وتفاصيل خصومات الرواتب بمسوداتها.', priority: 'critical', status: 'in_progress', start_date: '2026-07-01', deadline: '2026-07-25', estimated_hours: 50, actual_hours: 42, completion_percentage: 80, dependencies: ['TSK-001'], is_recurring: false, recurrence_pattern: '', created_at: '2026-06-28 10:00:00' },
      { task_id: 'TSK-003', project_id: 'PRJ-001', assigned_to: 'EMP-005', assigned_by: 'EMP-004', title: 'تصميم نظام الإشعارات وبوابة الرسائل الفورية', description: 'عمل التصاميم لغرفة الدردشة والتنبيهات الملونة المنسدلة في الهاتف والكمبيوتر.', priority: 'medium', status: 'new', start_date: '2026-07-20', deadline: '2026-08-10', estimated_hours: 30, actual_hours: 0, completion_percentage: 0, dependencies: [], is_recurring: false, recurrence_pattern: '', created_at: '2026-07-15 08:30:00' },
      { task_id: 'TSK-004', project_id: 'PRJ-002', assigned_to: 'EMP-005', assigned_by: 'EMP-004', title: 'تصميم الواجهة الخارجية الرئيسية وإعداد الهوية البصرية للأحمر والأصفر', description: 'تصميم وتكامل الصفحة التعريفية الرئيسية ونظام الأقسام المتجاوب للهاتف المحمول.', priority: 'high', status: 'completed', start_date: '2026-05-02', deadline: '2026-05-25', estimated_hours: 60, actual_hours: 58, completion_percentage: 100, dependencies: [], is_recurring: false, recurrence_pattern: '', created_at: '2026-05-01 09:00:00' }
    ],

    attendance: [
      { attendance_id: 1, employee_id: 'EMP-005', date: '2026-07-19', check_in: '2026-07-19 08:05:00', check_out: '2026-07-19 17:02:00', total_hours: 8.95, overtime_hours: 0.95, status: 'present', notes: 'حضور طبيعي مكتمل' },
      { attendance_id: 2, employee_id: 'EMP-005', date: '2026-07-20', check_in: '2026-07-20 08:02:00', check_out: null, total_hours: 8.0, overtime_hours: 0.0, status: 'present', notes: 'الدوام الحالي الجاري' }
    ],

    attendance_logs: [
      // 2026-07-19 Logs
      { log_id: 1, employee_id: 'EMP-005', attendance_id: 1, timestamp: '2026-07-19 09:00:00', hour_slot: 1, status: 'confirmed', device: '💻 PC', location: 'المكتب الرئيسي' },
      { log_id: 2, employee_id: 'EMP-005', attendance_id: 1, timestamp: '2026-07-19 10:01:00', hour_slot: 2, status: 'confirmed', device: '💻 PC', location: 'المكتب الرئيسي' },
      { log_id: 3, employee_id: 'EMP-005', attendance_id: 1, timestamp: '2026-07-19 11:00:00', hour_slot: 3, status: 'confirmed', device: '💻 PC', location: 'المكتب الرئيسي' },
      { log_id: 4, employee_id: 'EMP-005', attendance_id: 1, timestamp: '2026-07-19 12:02:00', hour_slot: 4, status: 'confirmed', device: '💻 PC', location: 'المكتب الرئيسي' },
      { log_id: 5, employee_id: 'EMP-005', attendance_id: 1, timestamp: '2026-07-19 13:00:00', hour_slot: 5, status: 'confirmed', device: '💻 PC', location: 'المكتب الرئيسي' },
      { log_id: 6, employee_id: 'EMP-005', attendance_id: 1, timestamp: '2026-07-19 14:05:00', hour_slot: 6, status: 'confirmed', device: '💻 PC', location: 'المكتب الرئيسي' },
      { log_id: 7, employee_id: 'EMP-005', attendance_id: 1, timestamp: '2026-07-19 15:00:00', hour_slot: 7, status: 'confirmed', device: '💻 PC', location: 'المكتب الرئيسي' },
      { log_id: 8, employee_id: 'EMP-005', attendance_id: 1, timestamp: '2026-07-19 16:00:00', hour_slot: 8, status: 'confirmed', device: '💻 PC', location: 'المكتب الرئيسي' },

      // 2026-07-20 Logs (Today - checkins progressive)
      { log_id: 9, employee_id: 'EMP-005', attendance_id: 2, timestamp: '2026-07-20 09:00:00', hour_slot: 1, status: 'confirmed', device: '💻 PC', location: 'المكتب الرئيسي' },
      { log_id: 10, employee_id: 'EMP-005', attendance_id: 2, timestamp: '2026-07-20 10:02:00', hour_slot: 2, status: 'confirmed', device: '💻 PC', location: 'المكتب الرئيسي' },
      { log_id: 11, employee_id: 'EMP-005', attendance_id: 2, timestamp: '2026-07-20 11:00:00', hour_slot: 3, status: 'confirmed', device: '💻 PC', location: 'المكتب الرئيسي' },
      { log_id: 12, employee_id: 'EMP-005', attendance_id: 2, timestamp: '2026-07-20 12:00:00', hour_slot: 4, status: 'confirmed', device: '💻 PC', location: 'المكتب الرئيسي' },
      { log_id: 13, employee_id: 'EMP-005', attendance_id: 2, timestamp: '2026-07-20 13:01:00', hour_slot: 5, status: 'confirmed', device: '💻 PC', location: 'المكتب الرئيسي' },
      { log_id: 14, employee_id: 'EMP-005', attendance_id: 2, timestamp: '2026-07-20 14:00:00', hour_slot: 6, status: 'confirmed', device: '💻 PC', location: 'المكتب الرئيسي' }
      // slots 7 and 8 are pending or not reached
    ],

    leaves: [
      { leave_id: 1, employee_id: 'EMP-005', type: 'annual', start_date: '2026-08-01', end_date: '2026-08-05', total_days: 5, reason: 'إجازة سنوية للسفر والاستجمام مع العائلة.', status: 'pending', approved_by: null, approved_at: null, rejection_reason: '', created_at: '2026-07-20 09:30:00' },
      { leave_id: 2, employee_id: 'EMP-004', type: 'sick', start_date: '2026-04-10', end_date: '2026-04-12', total_days: 2, reason: 'وعكة صحية طارئة مبررة بتقرير طبي رسمي.', status: 'approved', approved_by: 2, approved_at: '2026-04-10 10:00:00', rejection_reason: '', created_at: '2026-04-10 08:30:00' }
    ],

    salaries: [
      { salary_id: 1, employee_id: 'EMP-005', month: '2026-06', base_salary: 12000, allowances: 1500, bonuses: 500, gross_salary: 14000, deductions: 200, net_salary: 13800, payment_status: 'paid', paid_at: '2026-06-27 10:00:00', approved_by: 3, notes: 'راتب شهر يونيو المعتمد الكامل' },
      { salary_id: 2, employee_id: 'EMP-005', month: '2026-07', base_salary: 12000, allowances: 1500, bonuses: 0, gross_salary: 13500, deductions: 0, net_salary: 13500, payment_status: 'pending', paid_at: null, approved_by: null, notes: 'راتب شهر يوليو الحالي قيد الدراسة والاعتماد' }
    ],

    deduction_proposals: [
      { deduction_id: 1, employee_id: 'EMP-005', salary_id: 2, reason: 'تفويت بصمة ساعية واحدة يوم 2026-07-15 بدون عذر مقبول', amount: 150, status: 'draft', created_by: 4, approved_by: null, approved_at: null }
    ],

    clients: [
      { client_id: 1, name: 'نوكسورا تكنولوجيز (داخلي)', email: 'info@noxora.com', phone: '0110000000', company: 'Noxora Technologies', address: 'الرياض، السعودية', country: 'السعودية', value_score: 100, status: 'active', created_at: '2026-01-01 08:00:00' },
      { client_id: 2, name: 'الشركة العربية المتقدمة للاستثمار', email: 'invest@arabian.com', phone: '0120000000', company: 'Arabian Advanced Corp', address: 'جدة، السعودية', country: 'السعودية', value_score: 85, status: 'active', created_at: '2026-05-15 08:00:00' }
    ],

    revenues: [
      { revenue_id: 1, title: 'دفعة عقد IoT المتقدمة الأولى', type: 'عقود خارجية', project_id: 'PRJ-003', client_id: 2, amount: 125000, currency: 'SAR', date: '2026-06-05', payment_method: 'تحويل بنكي', reference: 'TXN-AR-9988', status: 'received', created_by: 3, notes: 'الدفعة الأولى المتفق عليها عند توقيع العقد للمشروع' }
    ],

    expenses: [
      { expense_id: 1, title: 'شراء أجهزة لابتوب للمطورين ومصمم الواجهات', category: 'أصول وتجهيزات مكتبية', project_id: 'PRJ-001', vendor: 'مكتبة جرير السعودية', amount: 15000, currency: 'SAR', date: '2026-03-10', description: 'توفير حواسيب عالية الأداء لتشغيل برامج التصميم والبرمجة الثقيلة لفريق NEMS.', approval_threshold: 5000, status: 'approved', created_by: 3, approved_by: 2, approved_at: '2026-03-10 14:00:00' },
      { expense_id: 2, title: 'شراء اشتراكات Figma لفريق التصميم والبرمجة', category: 'تراخيص برمجيات', project_id: 'PRJ-001', vendor: 'Figma Inc.', amount: 1200, currency: 'SAR', date: '2026-07-15', description: 'تجديد التراخيص السنوية لأدوات العمل التشاركية للمصممين.', approval_threshold: 5000, status: 'approved', created_by: 3, approved_by: 3, approved_at: '2026-07-15 11:00:00' }
    ],

    budgets: [
      { budget_id: 1, project_id: null, total_amount: 500000, spent_amount: 195000, remaining_amount: 305000, currency: 'SAR', period: '2026', created_at: '2026-01-01 08:00:00' },
      { budget_id: 2, project_id: 'PRJ-001', total_amount: 150000, spent_amount: 16200, remaining_amount: 133800, currency: 'SAR', period: '2026', created_at: '2026-02-28 09:00:00' }
    ],

    owners: [
      { owner_id: 1, user_id: 2, name: 'أحمد المنصوري (CEO)', email: 'ceo@noxora.com', phone: '0500000002', join_date: '2026-01-01', status: 'active', notes: 'الشريك المؤسس والمدير التنفيذي للشركة' },
      { owner_id: 2, user_id: 7, name: 'ناصر العتيبي', email: 'owner@noxora.com', phone: '0500000007', join_date: '2026-01-01', status: 'active', notes: 'شريك مستثمر رئيسي بنسبة هامة' },
      { owner_id: 3, user_id: 3, name: 'ليلى الرشيدي', email: 'finance@noxora.com', phone: '0500000003', join_date: '2026-01-10', status: 'active', notes: 'شريك ومسؤول مالي' }
    ],

    shares: [
      { share_id: 1, owner_id: 1, total_shares: 5000, ownership_percentage: 50.0, nominal_value: 10, current_value: 25, is_frozen: false, updated_at: '2026-07-20 12:00:00' },
      { share_id: 2, owner_id: 2, total_shares: 4000, ownership_percentage: 40.0, nominal_value: 10, current_value: 25, is_frozen: false, updated_at: '2026-07-20 12:00:00' },
      { share_id: 3, owner_id: 3, total_shares: 1000, ownership_percentage: 10.0, nominal_value: 10, current_value: 25, is_frozen: false, updated_at: '2026-07-20 12:00:00' }
    ],

    share_transactions: [
      { transaction_id: 1, from_owner_id: 1, to_owner_id: 3, shares_count: 500, transaction_type: 'transfer', price_per_share: 0, total_value: 0, status: 'completed', approved_by: 2, approved_at: '2026-03-01 10:00:00', notes: 'تحويل أسهم مكافأة نظير العمل والجهد المالي الأولي للتأسيس.', created_at: '2026-02-25 09:00:00' }
    ],

    profit_distributions: [
      { distribution_id: 1, owner_id: 1, period: '2026-Q1', total_profit: 100000, owner_percentage: 50.0, amount: 50000, payment_status: 'paid', paid_at: '2026-04-10 12:00:00', approved_by: 2 },
      { distribution_id: 2, owner_id: 2, period: '2026-Q1', total_profit: 100000, owner_percentage: 40.0, amount: 40000, payment_status: 'paid', paid_at: '2026-04-10 12:10:00', approved_by: 2 },
      { distribution_id: 3, owner_id: 3, period: '2026-Q1', total_profit: 100000, owner_percentage: 10.0, amount: 10000, payment_status: 'paid', paid_at: '2026-04-10 12:15:00', approved_by: 2 }
    ],

    votes: [
      { vote_id: 1, title: 'اعتماد الميزانية السنوية التوسعية 2027', description: 'التصويت على اعتماد ميزانية تسويقية وتطويرية إضافية لفتح فروع جديدة بالشرق الأوسط بقيمة 400 ألف ريال.', type: 'capital', created_by: 2, start_date: '2026-07-15 08:00:00', end_date: '2026-07-25 17:00:00', status: 'active', weight_by_shares: true, winner_option_id: null }
    ],

    vote_options: [
      { option_id: 1, vote_id: 1, option_text: 'الموافقة على الخطة بالكامل', votes_count: 1, weighted_percentage: 50.0 },
      { option_id: 2, vote_id: 1, option_text: 'الرفض والطلب بإعادة الصياغة والتعديل', votes_count: 0, weighted_percentage: 0 },
      { option_id: 3, vote_id: 1, option_text: 'التحفظ أو تأجيل التصويت لشهر أكتوبر', votes_count: 0, weighted_percentage: 0 }
    ],

    user_votes: [
      { id: 1, vote_id: 1, user_id: 2, option_id: 1, shares_weight: 5000, created_at: '2026-07-16 10:00:00' }
      // Layla (1000 shares) and Nasser (4000 shares) are yet to vote
    ],

    meetings: [
      { meeting_id: 1, title: 'اجتماع التخطيط الأسبوعي لفريق NEMS', description: 'مراجعة المنجز من الواجهات والاتفاق على هيكلة قواعد البيانات LocalStorage والأمان التفاعلي.', type: 'فني', organizer_id: 5, project_id: 'PRJ-001', date: '2026-07-22', start_time: '10:00:00', end_time: '11:30:00', location: 'قاعة الاجتماعات الرئيسية / رابط Meet المرفق', agenda: '1. مراجعة واجهات لوحة التحكم والمهام.\n2. التوافق على هيكلية 36 جدول للبيانات.\n3. نقاش معايير أمان الصلاحيات وحظر الخصومات المقترحة.', minutes: '', decisions: '', status: 'scheduled', created_at: '2026-07-20 09:00:00' }
    ],

    meeting_attendees: [
      { id: 1, meeting_id: 1, user_id: 5, attendance_status: 'confirmed', joined_at: null },
      { id: 2, meeting_id: 1, user_id: 6, attendance_status: 'confirmed', joined_at: null },
      { id: 3, meeting_id: 1, user_id: 2, attendance_status: 'invited', joined_at: null },
      { id: 4, meeting_id: 1, user_id: 4, attendance_status: 'invited', joined_at: null }
    ],

    conversations: [
      { conversation_id: 1, type: 'project_team', name: 'قنوات فريق عمل NEMS الرئيسي', project_id: 'PRJ-001', created_by: 2, created_at: '2026-03-01 09:00:00', last_message_at: '2026-07-20 11:35:00' },
      { conversation_id: 2, type: 'direct', name: 'CEO & CFO', project_id: null, created_by: 2, created_at: '2026-01-10 10:00:00', last_message_at: '2026-07-19 14:22:00' }
    ],

    conversation_members: [
      // Channel 1 Members
      { id: 1, conversation_id: 1, user_id: 2, joined_at: '2026-03-01 09:00:00', is_admin: true, is_muted: false },
      { id: 2, conversation_id: 1, user_id: 5, joined_at: '2026-03-01 09:00:00', is_admin: false, is_muted: false },
      { id: 3, conversation_id: 1, user_id: 6, joined_at: '2026-03-01 09:00:00', is_admin: false, is_muted: false },
      { id: 4, conversation_id: 1, user_id: 3, joined_at: '2026-03-01 09:00:00', is_admin: false, is_muted: false },
      { id: 5, conversation_id: 1, user_id: 4, joined_at: '2026-03-01 09:00:00', is_admin: false, is_muted: false },
      // Direct chat CEO & CFO
      { id: 6, conversation_id: 2, user_id: 2, joined_at: '2026-01-10 10:00:00', is_admin: true, is_muted: false },
      { id: 7, conversation_id: 2, user_id: 3, joined_at: '2026-01-10 10:00:00', is_admin: true, is_muted: false }
    ],

    messages: [
      { message_id: 1, sender_id: 5, receiver_id: null, conversation_id: 1, message_text: 'أهلاً بالفريق، تم رفع مسودات الواجهات الخاصة بنسخة الجوال والتصميم الموحد للأحمر والأصفر للمراجعة.', file_id: null, is_read: true, status: 'read', created_at: '2026-07-20 11:30:00' },
      { message_id: 2, sender_id: 2, receiver_id: null, conversation_id: 1, message_text: 'رائع جداً يا سارة، سأقوم بمراجعتها قبل موعد اجتماعنا الفني بعد غد إن شاء الله.', file_id: null, is_read: true, status: 'read', created_at: '2026-07-20 11:35:00' },
      { message_id: 3, sender_id: 2, receiver_id: 3, conversation_id: 2, message_text: 'ليلى، يرجى مراجعة واعتماد طلب الشراء الخاص ب Figma المرفوع من الموارد اليوم.', file_id: null, is_read: true, status: 'read', created_at: '2026-07-19 14:20:00' },
      { message_id: 4, sender_id: 3, receiver_id: 2, conversation_id: 2, message_text: 'تمت المراجعة والاعتماد الفوري، وخصم المبلغ من الميزانية المخصصة لمشروع NEMS.', file_id: null, is_read: true, status: 'read', created_at: '2026-07-19 14:22:00' }
    ],

    files: [
      { file_id: 1, name: 'عقد تأسيس شركة نوكسورا تكنولوجيز.pdf', original_name: 'Noxora_Articles_of_Association.pdf', type: 'application/pdf', size: 1048576, category: 'contract', department_id: 1, project_id: null, confidentiality: 'top_secret', current_version: 1, uploaded_by: 2, created_at: '2026-01-01 08:30:00' },
      { file_id: 2, name: 'سياسة الحضور والانصراف الساعي للشركة.docx', original_name: 'Attendance_Policy_v1.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 512000, category: 'policy', department_id: 5, project_id: null, confidentiality: 'internal', current_version: 2, uploaded_by: 4, created_at: '2026-01-16 10:00:00' }
    ],

    project_documents: [
      { id: 1, project_id: 'PRJ-001', file_id: 2, document_type: 'سياسة تنظيمية داخلية', added_at: '2026-03-01 09:30:00' }
    ],

    file_versions: [
      { version_id: 1, file_id: 2, version_number: 1, content_snapshot: 'المسودة الأولى لسياسة الحضور والانصراف اليومي.', change_note: 'المسودة التأسيسية الأولى المرفوعة من الموارد البشرية.', uploaded_by: 4, is_rollback: false, created_at: '2026-01-16 10:00:00' },
      { version_id: 2, file_id: 2, version_number: 2, content_snapshot: 'تعديل السياسة لتشمل تسجيل الحضور الساعي بواقع 8 بصمات وتفصيل الخصومات والخيارات الإدارية للموافقة.', change_note: 'إضافة البند الساعي بناء على توجيهات المدير العام.', uploaded_by: 4, is_rollback: false, created_at: '2026-02-10 11:30:00' }
    ],

    announcements: [
      { announcement_id: 1, title: 'تفعيل نظام إدارة الحضور الساعي الجديد للشركة', content: 'نود إشعار كافة الموظفين ببدء تطبيق الدورة الساعية للحضور (8 بصمات خلال الدوام اليومي) عبر كشاف الحضور الموحد لتفادي نقص الساعات واحتساب الإنتاجية بدقة.', created_by: 2, target_group: 'all', priority: 'important', is_pinned: true, date: '2026-07-15 08:30:00', expires_at: '2026-08-15 17:00:00' }
    ],

    notifications: [
      { notification_id: 1, user_id: 5, title: 'مهمة جديدة مسندة', message: 'لقد قامت سارة الزهراني بإسناد مهمة "تصميم نظام الإشعارات وبوابة الرسائل" لك بموعد تسليم 10 أغسطس.', type: 'task', related_id: 3, related_module: 'Projects', is_read: false, is_archived: false, created_at: '2026-07-20 11:30:00' },
      { notification_id: 2, user_id: 3, title: 'طلب اعتماد مصروفات', message: 'هناك مصروف بقيمة 15,000 ريال بانتظار موافقتك للمورد "جرير".', type: 'finance', related_id: 1, related_module: 'Finance', is_read: false, is_archived: false, created_at: '2026-07-20 10:00:00' }
    ],

    system_settings: [
      { setting_id: 1, key: 'company_name', value: 'Noxora Technologies', type: 'string', category: 'company', label_ar: 'اسم الشركة', label_en: 'Company Name', updated_by: 1, updated_at: '2026-07-20 12:00:00' },
      { setting_id: 2, key: 'primary_color', value: '#C0392B', type: 'string', category: 'appearance', label_ar: 'اللون الأساسي للشركة (أحمر)', label_en: 'Primary Color (Red)', updated_by: 1, updated_at: '2026-07-20 12:00:00' },
      { setting_id: 3, key: 'secondary_color', value: '#F39C12', type: 'string', category: 'appearance', label_ar: 'اللون الثانوي للشركة (أصفر)', label_en: 'Secondary Color (Yellow)', updated_by: 1, updated_at: '2026-07-20 12:00:00' },
      { setting_id: 4, key: 'default_language', value: 'ar', type: 'string', category: 'appearance', label_ar: 'اللغة الافتراضية للواجهة', label_en: 'Default Language', updated_by: 1, updated_at: '2026-07-20 12:00:00' },
      { setting_id: 5, key: 'work_start_time', value: '08:00', type: 'string', category: 'attendance', label_ar: 'وقت بدء الدوام الرسمي', label_en: 'Official Work Start Time', updated_by: 1, updated_at: '2026-07-20 12:00:00' },
      { setting_id: 6, key: 'work_end_time', value: '17:00', type: 'string', category: 'attendance', label_ar: 'وقت نهاية الدوام الرسمي', label_en: 'Official Work End Time', updated_by: 1, updated_at: '2026-07-20 12:00:00' },
      { setting_id: 7, key: 'hourly_checkins_required', value: '8', type: 'number', category: 'attendance', label_ar: 'عدد البصمات الساعية المطلوبة يومياً', label_en: 'Hourly Check-ins Required Daily', updated_by: 1, updated_at: '2026-07-20 12:00:00' },
      { setting_id: 8, key: 'late_tolerance_minutes', value: '15', type: 'number', category: 'attendance', label_ar: 'فترة السماح للتأخر (دقائق)', label_en: 'Late Tolerance Period (Minutes)', updated_by: 1, updated_at: '2026-07-20 12:00:00' },
      { setting_id: 9, key: 'maintenance_mode', value: 'false', type: 'boolean', category: 'security', label_ar: 'وضع الصيانة العالمي للنظام', label_en: 'Global Maintenance Mode', updated_by: 1, updated_at: '2026-07-20 12:00:00' },
      { setting_id: 10, key: 'expense_approval_threshold', value: '5000', type: 'number', category: 'payroll', label_ar: 'الحد الأقصى للموافقة المالية المباشرة للمحاسب', label_en: 'Direct Expense Approval Threshold', updated_by: 1, updated_at: '2026-07-20 12:00:00' }
    ],

    feedback_reports: [
      { id: 1, userId: 6, screen: 'لوحة الحضور الشخصي للجوال', type: 'تحسين', description: 'نقترح إظهار عداد الساعات المتبقية بشكل دائري متحرك وأكثر وضوحاً في الشاشة الرئيسية للجوال.', priority: 'normal', status: 'pending', timestamp: '2026-07-20 11:45:00' }
    ],

    audit_log: [
      { log_id: 1, user_id: 1, user_name: 'System Admin', action: 'initialized', module: 'System', entity_type: 'database', entity_id: 'NEMS_DB', old_value: null, new_value: { status: 'success' }, ip_address: '127.0.0.1', device: '💻 server-init', timestamp: '2026-07-20 21:55:00' }
    ]
  },

  // DB API Utility Functions
  initDB: function() {
    for (let key in this.seed) {
      const storageKey = this.PREFIX + key;
      if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, JSON.stringify(this.seed[key]));
      }
    }
  },

  getTable: function(table) {
    const data = localStorage.getItem(this.PREFIX + table);
    return data ? JSON.parse(data) : [];
  },

  saveTable: function(table, data) {
    localStorage.setItem(this.PREFIX + table, JSON.stringify(data));
  },

  insertRecord: function(table, record, userId = 1) {
    const data = this.getTable(table);
    
    // Auto increment primary key estimation
    let newId = 1;
    let idKey = this.getPrimaryKeyField(table);
    if (data.length > 0) {
      const ids = data.map(item => {
        const val = item[idKey];
        if (typeof val === 'number') return val;
        // Strip out non-numeric prefixes for strings like EMP-001 or PRJ-002
        if (typeof val === 'string') {
          const match = val.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        }
        return 0;
      });
      newId = Math.max(...ids) + 1;
    }

    if (idKey) {
      if (typeof data[0]?.[idKey] === 'string') {
        const prefix = data[0][idKey].split('-')[0] || 'REC';
        record[idKey] = `${prefix}-${String(newId).padStart(3, '0')}`;
      } else {
        record[idKey] = newId;
      }
    }

    record.created_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
    data.push(record);
    this.saveTable(table, data);

    // Logging to Audit Trail
    this.auditLog(
      userId,
      'create',
      this.getModuleForTable(table),
      table,
      record[idKey] || 'N/A',
      null,
      record
    );

    return record;
  },

  updateRecord: function(table, idValue, updatedFields, userId = 1) {
    const data = this.getTable(table);
    const idKey = this.getPrimaryKeyField(table);
    const index = data.findIndex(item => item[idKey] === idValue);

    if (index === -1) return false;

    const oldRecord = JSON.parse(JSON.stringify(data[index]));
    const newRecord = { ...data[index], ...updatedFields, updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19) };

    data[index] = newRecord;
    this.saveTable(table, data);

    // Logging to Audit Trail
    this.auditLog(
      userId,
      'update',
      this.getModuleForTable(table),
      table,
      idValue,
      oldRecord,
      newRecord
    );

    return newRecord;
  },

  deleteRecord: function(table, idValue, userId = 1) {
    const data = this.getTable(table);
    const idKey = this.getPrimaryKeyField(table);
    const index = data.findIndex(item => item[idKey] === idValue);

    if (index === -1) return false;

    const oldRecord = data[index];
    data.splice(index, 1);
    this.saveTable(table, data);

    // Logging to Audit Trail
    this.auditLog(
      userId,
      'delete',
      this.getModuleForTable(table),
      table,
      idValue,
      oldRecord,
      null
    );

    return true;
  },

  auditLog: function(userId, action, module, entityType, entityId, oldValue, newValue) {
    const auditData = this.getTable('audit_log');
    
    // Get user details
    const users = this.getTable('users');
    const user = users.find(u => u.user_id === userId) || { name: 'زائر / نظام' };

    const newLog = {
      log_id: auditData.length > 0 ? Math.max(...auditData.map(l => l.log_id)) + 1 : 1,
      user_id: userId,
      user_name: user.name,
      action: action,
      module: module,
      entity_type: entityType,
      entity_id: String(entityId),
      old_value: oldValue,
      new_value: newValue,
      ip_address: '127.0.0.1',
      device: window.innerWidth < 768 ? '📱 Mobile' : '💻 Desktop',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    auditData.push(newLog);
    this.saveTable('audit_log', auditData);
  },

  schemaIntegrityCheck: function(importedData) {
    // Verifies all 37 tables are present and structurally correct
    const requiredTables = Object.keys(this.seed);
    for (let table of requiredTables) {
      if (!importedData[table] || !Array.isArray(importedData[table])) {
        return { success: false, error: `الجدول المفقود أو التالف: ${table}` };
      }
    }
    return { success: true };
  },

  getPrimaryKeyField: function(table) {
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
  },

  getModuleForTable: function(table) {
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
};

// Auto initialize database on load
NEMS_DB.initDB();
window.NEMS_DB = NEMS_DB;
