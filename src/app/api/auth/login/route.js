import { NextResponse } from 'next/server';
import { getTable } from '@/lib/db';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني وكلمة المرور مطلوبان.' },
        { status: 400 }
      );
    }

    // Look up user by email
    const users = await getTable('users');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني غير موجود في النظام.' },
        { status: 401 }
      );
    }

    // Check password (plain text in dev / hash in prod)
    if (user.password_hash !== password) {
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

    if (owner && secondaryRole) {
      let secondaryRoleObj = roles.find(r => r.role_name.toLowerCase() === secondaryRole.toLowerCase());
      if (!secondaryRoleObj && (secondaryRole === 'CREATOR' || secondaryRole === 'PM')) {
        secondaryRoleObj = roles.find(r => r.role_name.toLowerCase() === 'pm');
      }
      if (secondaryRoleObj && secondaryRoleObj.sidebar_modules) {
        // Unique merge of modules
        sidebarModules = Array.from(new Set([...sidebarModules, ...secondaryRoleObj.sidebar_modules]));
      }
    }

    // Update last login (fire and forget)
    try {
      const { updateRecord } = await import('@/lib/db');
      await updateRecord('users', user.user_id, {
        last_login: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }, user.user_id);
    } catch { /* ignore last_login update errors */ }

    // Return session payload (never return password)
    const { password_hash, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      user: {
        ...safeUser,
        role_name: role?.role_name || 'Unknown',
        secondary_role_name: secondaryRole,
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
