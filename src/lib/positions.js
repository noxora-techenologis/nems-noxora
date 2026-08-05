/**
 * NEMS Job Positions
 * Shared list of company job positions (مناصب التوظيف).
 * Used by the owner-roles API and the user/employee creation forms.
 */
export const ALL_POSITIONS = [
  // الإدارة العليا والتنفيذية
  { code: 'CEO', name: 'المدير العام', group: 'الإدارة العليا والتنفيذية' },
  { code: 'COO', name: 'مدير العمليات', group: 'الإدارة العليا والتنفيذية' },
  { code: 'CFO', name: 'المدير المالي', group: 'الإدارة العليا والتنفيذية' },
  { code: 'CTO', name: 'المدير التقني', group: 'الإدارة العليا والتنفيذية' },
  { code: 'CMO', name: 'مدير التسويق', group: 'الإدارة العليا والتنفيذية' },
  { code: 'CHRO', name: 'مدير الموارد البشرية', group: 'الإدارة العليا والتنفيذية' },
  { code: 'CPO', name: 'مدير المنتج', group: 'الإدارة العليا والتنفيذية' },
  // الإدارة الوسطى
  { code: 'PM', name: 'مدير مشاريع', group: 'الإدارة الوسطى' },
  { code: 'FM', name: 'مدير حسابات', group: 'الإدارة الوسطى' },
  { code: 'HR', name: 'مدير HR', group: 'الإدارة الوسطى' },
  { code: 'MARKETING', name: 'مدير تسويق', group: 'الإدارة الوسطى' },
  { code: 'SALES', name: 'مدير مبيعات', group: 'الإدارة الوسطى' },
  { code: 'OPS', name: 'مدير تشغيل', group: 'الإدارة الوسطى' },
  { code: 'LEGAL', name: 'مستشار قانوني', group: 'الإدارة الوسطى' },
  { code: 'IT', name: 'مدير معلومات', group: 'الإدارة الوسطى' },
  // المالية والتقنية وصناعة المحتوى
  { code: 'ACCOUNTANT', name: 'المحاسب', group: 'مالية وتقنية ومحتوى' },
  { code: 'SUPERVISOR', name: 'المشرف', group: 'مالية وتقنية ومحتوى' },
  { code: 'ENGINEER', name: 'المهندس', group: 'مالية وتقنية ومحتوى' },
  { code: 'DESIGNER', name: 'المصمم', group: 'مالية وتقنية ومحتوى' },
  { code: 'ANALYST', name: 'المحلل', group: 'مالية وتقنية ومحتوى' },
  { code: 'CREATOR', name: 'صانع المحتوى', group: 'مالية وتقنية ومحتوى' },
  // التشغيلية والخدمات المساندة
  { code: 'RECEPTIONIST', name: 'استقبال', group: 'تشغيلية وخدمات مساندة' },
  { code: 'SECURITY', name: 'أمن', group: 'تشغيلية وخدمات مساندة' },
  { code: 'DRIVER', name: 'سائق', group: 'تشغيلية وخدمات مساندة' },
  { code: 'EMPLOYEE', name: 'موظف عام', group: 'تشغيلية وخدمات مساندة' },
  { code: 'SHIPPING_AGENT', name: 'وكيل الشحن', group: 'تشغيلية وخدمات مساندة' },
];

/**
 * Map each job position code to the closest system role key
 * (controls dashboard access / permissions).
 * Falls back to 'employee' when no role applies.
 */
export const POSITION_ROLE_MAP = {
  CEO: 'ceo',
  COO: 'ceo',
  CFO: 'fm',
  CTO: 'employee',
  CMO: 'employee',
  CHRO: 'hr',
  CPO: 'pm',
  PM: 'pm',
  FM: 'fm',
  HR: 'hr',
  MARKETING: 'employee',
  SALES: 'employee',
  OPS: 'employee',
  LEGAL: 'employee',
  IT: 'employee',
  ACCOUNTANT: 'fm',
  SUPERVISOR: 'employee',
  ENGINEER: 'employee',
  DESIGNER: 'employee',
  ANALYST: 'employee',
  CREATOR: 'employee',
  RECEPTIONIST: 'employee',
  SECURITY: 'employee',
  DRIVER: 'employee',
  EMPLOYEE: 'employee',
  SHIPPING_AGENT: 'shipping_agent',
};

