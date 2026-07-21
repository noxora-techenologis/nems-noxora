import { getTable, saveTable } from '@/lib/db';

export async function POST(request) {
  try {
    const { userId, currentPassword, newPassword, requesterId, requesterRole } = await request.json();

    if (!userId || !newPassword) {
      return Response.json({ success: false, error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return Response.json({ success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
    }

    const users = await getTable('users');
    const targetUserIndex = users.findIndex(u => u.user_id === userId);

    if (targetUserIndex === -1) {
      return Response.json({ success: false, error: 'المستخدم غير موجود' }, { status: 404 });
    }

    const targetUser = users[targetUserIndex];
    const isAdmin = requesterRole?.toLowerCase() === 'admin';
    const isSelf = requesterId === userId;

    // If changing own password → verify current password
    if (isSelf) {
      if (!currentPassword) {
        return Response.json({ success: false, error: 'يرجى إدخال كلمة المرور الحالية' }, { status: 400 });
      }
      if (targetUser.password_hash !== currentPassword) {
        return Response.json({ success: false, error: 'كلمة المرور الحالية غير صحيحة' }, { status: 401 });
      }
    } else if (!isAdmin) {
      // Non-admin trying to change someone else's password → forbidden
      return Response.json({ success: false, error: 'لا تملك صلاحية تغيير كلمة مرور مستخدم آخر' }, { status: 403 });
    }

    // Update password
    users[targetUserIndex] = {
      ...targetUser,
      password_hash: newPassword,
      updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    await saveTable('users', users);

    return Response.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    console.error('Change password error:', err);
    return Response.json({ success: false, error: 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}
