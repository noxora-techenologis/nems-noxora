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
  ceo:      ['dashboard', 'employees', 'attendance', 'projects', 'finance', 'owners', 'meetings', 'documents', 'messages', 'reports', 'settings'],
  fm:       ['dashboard', 'finance', 'employees', 'reports', 'meetings'],
  hr:       ['dashboard', 'employees', 'attendance', 'meetings', 'reports'],
  pm:       ['dashboard', 'projects', 'meetings', 'documents'],
  employee: ['dashboard', 'attendance', 'projects', 'meetings', 'documents', 'messages'],
  owner:    ['dashboard', 'owners', 'reports'],
};

export function hasAccess(role, module, session) {
  if (session && session.sidebar_modules) {
    return session.sidebar_modules.includes(module);
  }
  const roleKey = typeof role === 'string' ? role.toLowerCase() : '';
  const modules = ROLE_MODULES[roleKey] || [];
  return modules.includes(module);
}

export function getDashboardPath(role) {
  const roleKey = role?.toLowerCase();
  const paths = {
    admin: '/dashboard/admin',
    ceo: '/dashboard/ceo',
    fm: '/dashboard/fm',
    hr: '/dashboard/hr',
    pm: '/dashboard/pm',
    employee: '/dashboard/employee',
    owner: '/dashboard/owner',
  };
  return paths[roleKey] || '/dashboard';
}
