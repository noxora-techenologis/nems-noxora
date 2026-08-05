import { NextResponse } from 'next/server';
import { updateRecord, getTable } from '@/lib/db';
import { verifySession, requireRole } from '@/lib/serverAuth';

export async function POST(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const { userId, currentPassword, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ success: false, error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
    }

    const users = await getTable('users');
    const targetUser = users.find(u => u.user_id === Number(userId));

    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'المستخدم غير موجود' }, { status: 404 });
    }

    const isSelf = user.user_id === Number(userId);
    const roleErr = await requireRole(user, ['admin']);
    const isAdmin = !roleErr;

    if (isSelf) {
      if (!currentPassword) {
        return NextResponse.json({ success: false, error: 'يرجى إدخال كلمة المرور الحالية' }, { status: 400 });
      }
      if (targetUser.password_hash !== currentPassword) {
        return NextResponse.json({ success: false, error: 'كلمة المرور الحالية غير صحيحة' }, { status: 401 });
      }
    } else if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'لا تملك صلاحية تغيير كلمة مرور مستخدم آخر' }, { status: 403 });
    }

    await updateRecord('users', userId, { password_hash: newPassword }, user.user_id);

    return NextResponse.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    console.error('Change password error:', err);
    return NextResponse.json({ success: false, error: 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}
