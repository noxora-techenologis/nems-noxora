import { NextResponse } from 'next/server';
import { getTable } from '@/lib/db';
import { verifySession } from '@/lib/serverAuth';

export async function GET(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get('userId') || '0');

    // Default to authenticated user's own notifications when no userId param
    const targetUserId = userId || user.user_id;

    // Users can only fetch their own notifications
    if (targetUserId !== user.user_id) {
      const roles = await getTable('roles');
      const role = roles.find(r => r.role_id === user.role_id);
      const roleKey = (user.role_name || role?.role_name || '').toLowerCase();
      if (!['admin', 'ceo', 'fm'].includes(roleKey)) {
        return NextResponse.json({ error: 'غير مصرح — لا يمكنك عرض إشعارات مستخدم آخر' }, { status: 403 });
      }
    }

    const notifications = await getTable('notifications');
    const userNotifs = notifications.filter(n => n.user_id === targetUserId);

    // Sort by date descending
    userNotifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({ notifications: userNotifs });
  } catch (err) {
    console.error('Notifications GET Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
