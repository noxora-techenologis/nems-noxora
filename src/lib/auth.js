/**
 * NEMS Auth Utilities
 * Client-side session management using localStorage
 */

export const SESSION_KEY = 'nems_session';

export function getSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    // Check session expiry (24 hours)
    if (session.expires && Date.now() > session.expires) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setSession(userData) {
  if (typeof window === 'undefined') return;
  const session = {
    ...userData,
    expires: Date.now() + (24 * 60 * 60 * 1000), // 24h
    loginTime: Date.now()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

export function requireAuth(router) {
  if (typeof window === 'undefined') return false;
  const session = getSession();
  if (!session) {
    router.push('/login');
    return false;
  }
  return true;
}

// Role-based access control
export const ROLE_MODULES = {
  admin:    ['dashboard', 'users', 'settings', 'logs'],
  ceo:      ['dashboard', 'employees', 'attendance', 'projects', 'clients', 'finance', 'owners', 'meetings', 'documents', 'messages', 'reports', 'settings'],
  fm:       ['dashboard', 'finance', 'clients', 'employees', 'reports', 'meetings'],
  hr:       ['dashboard', 'employees', 'attendance', 'meetings', 'reports'],
  pm:       ['dashboard', 'projects', 'clients', 'meetings', 'documents'],
  employee: ['dashboard', 'attendance', 'projects', 'meetings', 'documents', 'messages'],
  owner:    ['dashboard', 'owners', 'reports'],
};

// Normalize role string or Arabic role title into valid role key
export function normalizeRoleKey(role) {
  if (!role) return 'employee';
  const r = String(role).toLowerCase();
  if (r.includes('admin') || r.includes('تقني') || r.includes('مدير النظام')) return 'admin';
  if (r.includes('ceo') || r.includes('المدير العام') || r.includes('مدير عام')) return 'ceo';
  if (r.includes('fm') || r.includes('مالية') || r.includes('المالية')) return 'fm';
  if (r.includes('hr') || r.includes('موارد') || r.includes('الموارد البشرية')) return 'hr';
  if (r.includes('pm') || r.includes('مشاريع') || r.includes('مدير المشاريع')) return 'pm';
  if (r.includes('owner') || r.includes('مالك') || r.includes('ملاك') || r.includes('أسهم')) return 'owner';
  return 'employee';
}

export function hasAccess(role, module, session) {
  if (session && session.sidebar_modules) {
    return session.sidebar_modules.includes(module);
  }
  const roleKey = normalizeRoleKey(role);
  const modules = ROLE_MODULES[roleKey] || [];
  return modules.includes(module);
}

export function getDashboardPath(role, dashboardType) {
  const target = dashboardType || role;
  const roleKey = normalizeRoleKey(target);
  return `/dashboard/${roleKey}`;
}
