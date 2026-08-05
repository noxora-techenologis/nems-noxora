import { NextResponse } from 'next/server';
import { getTable } from '@/lib/db';
import { verifySession } from '@/lib/serverAuth';

export async function GET(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get('userId') || '0');

    // Users can only fetch their own notifications
    if (userId && userId !== user.user_id) {
      return NextResponse.json({ error: 'غير مصرح — لا يمكنك عرض إشعارات مستخدم آخر' }, { status: 403 });
    }

    const notifications = await getTable('notifications');
    const userNotifs = userId
      ? notifications.filter(n => n.user_id === userId)
      : [];

    // Sort by date descending
    userNotifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({ notifications: userNotifs });
  } catch (err) {
    console.error('Notifications GET Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
