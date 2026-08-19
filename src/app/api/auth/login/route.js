import { NextResponse } from 'next/server';
import { getTable } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Simple in-memory rate limiter: max 10 attempts per email per 15 minutes
const loginAttempts = new Map();
const RATE_WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

// Prune expired entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts) {
    if (now - record.start > RATE_WINDOW) loginAttempts.delete(key);
  }
}, 5 * 60 * 1000).unref();

function checkRateLimit(email) {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || now - record.start > RATE_WINDOW) {
    loginAttempts.set(key, { start: now, count: 1 });
    return true;
  }
  record.count++;
  if (record.count > MAX_ATTEMPTS) return false;
  return true;
}

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني وكلمة المرور مطلوبان.' },
        { status: 400 }
      );
    }

    // Rate limit check
    if (!checkRateLimit(email)) {
      return NextResponse.json(
        { error: 'تم تجاوز عدد المحاولات المسموح. حاول مرة أخرى بعد 15 دقيقة.' },
        { status: 429 }
      );
    }

    // Look up user by email
    const users = await getTable('users');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' },
        { status: 401 }
      );
    }

    // Check password: bcrypt only — all passwords must be hashed
    if (!user.password_hash?.startsWith('$2')) {
      console.error(`User ${user.email} has unhashed password — rejected`);
      return NextResponse.json(
        { error: 'حدث خطأ في النظام. تواصل مع المدير.' },
        { status: 500 }
      );
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return NextResponse.json(
        { error: 'كلمة المرور غير صحيحة.' },
        { status: 401 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'هذا الحساب موقوف أو غير مفعل. تواصل مع مدير النظام.' },
        { status: 403 }
      );
    }

    // Get role info
    const roles = await getTable('roles');
    const role = roles.find(r => r.role_id === user.role_id);

    // Get employee info if exists
    const employees = await getTable('employees');
    const employee = employees.find(e => e.user_id === user.user_id);

    // Get owner info if exists
    const owners = await getTable('owners');
    const owner = owners.find(o => o.user_id === user.user_id);

    let sidebarModules = role?.sidebar_modules || [];
    let secondaryRole = owner?.secondary_role_name || null;
    const activeRoles = owner?.active_roles || ['OWNER'];

    // Merge sidebar modules from all active roles (multi-role accumulation)
    for (const ar of activeRoles) {
      const arKey = ar?.toLowerCase?.() || '';
      if (arKey === 'owner') continue; // owner modules already included
      let arRoleObj = roles.find(r => r.role_name?.toLowerCase() === arKey);
      if (!arRoleObj && (arKey === 'creator')) {
        arRoleObj = roles.find(r => r.role_name?.toLowerCase() === 'pm');
      }
      if (arRoleObj?.sidebar_modules) {
        sidebarModules = Array.from(new Set([...sidebarModules, ...arRoleObj.sidebar_modules]));
      }
    }

    // Update last login (fire and forget)
    try {
      const { updateRecord } = await import('@/lib/db');
      await updateRecord('users', user.user_id, {
        last_login: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }, user.user_id);
    } catch (err) { console.error('Failed to update last_login:', err); }

    // Return session payload (never return password)
    const { password_hash, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      user: {
        ...safeUser,
        role_name: role?.role_name || 'Unknown',
        secondary_role_name: secondaryRole,
        active_roles: activeRoles,
        dashboard_type: role?.dashboard_type || 'employee',
        sidebar_modules: sidebarModules,
        employee_id: employee?.employee_id || null,
        department_id: employee?.department_id || null,
        job_title: employee?.job_title || null,
        owner_id: owner?.owner_id || null,
      }
    });

  } catch (err) {
    console.error('Login API Error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم. حاول مجدداً.' },
      { status: 500 }
    );
  }
}
