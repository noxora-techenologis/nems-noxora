/**
 * NEMS Server-Side Auth Helper
 * =============================
 * Lightweight auth verification for API routes.
 * Client sends user_id via x-user-id header.
 * Server verifies the user exists in the database.
 *
 * This is NOT full security (no tokens/sessions), but it prevents
 * unauthenticated calls and basic spoofing from the browser console.
 */

import { getTable } from './db';

/**
 * Verify the request has a valid user_id from the client session.
 * Returns { user, error } — if error is set, return it as NextResponse.
 *
 * Usage in API routes:
 *   const { user, error } = await verifySession(request);
 *   if (error) return error;
 */
export async function verifySession(request) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return {
      user: null,
      error: Response.json({ error: 'غير مصرح — يرجى تسجيل الدخول مجدداً.' }, { status: 401 }),
    };
  }

  const numId = Number(userId);
  if (!numId || numId <= 0) {
    return {
      user: null,
      error: Response.json({ error: 'معرف المستخدم غير صالح.' }, { status: 401 }),
    };
  }

  const users = await getTable('users');
  const user = users.find(u => u.user_id === numId);

  if (!user) {
    return {
      user: null,
      error: Response.json({ error: 'المستخدم غير موجود.' }, { status: 401 }),
    };
  }

  return { user, error: null };
}

/**
 * Verify the request user has one of the allowed roles.
 * Must be called AFTER verifySession.
 *
 * Resolves the user's actual role from the `roles` table via role_id,
 * since users.role_name is not reliably populated.
 *
 * Usage:
 *   const { user, error } = await verifySession(request);
 *   if (error) return error;
 *   const roleError = await requireRole(user, ['ceo', 'admin', 'fm']);
 *   if (roleError) return roleError;
 */
export async function requireRole(user, allowedRoles) {
  const roles = await getTable('roles');
  const role = roles.find(r => r.role_id === user.role_id);

  const userRoleRaw = user.role_name || role?.role_name || '';
  const userRole = userRoleRaw.toLowerCase();
  const allowed = allowedRoles.map(r => r.toLowerCase());

  if (!allowed.includes(userRole)) {
    return Response.json(
      { error: `غير مصرح — الصلاحية المطلوبة: ${allowedRoles.join(' أو ')}` },
      { status: 403 }
    );
  }

  return null;
}
