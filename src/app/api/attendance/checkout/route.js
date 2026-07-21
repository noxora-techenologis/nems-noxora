import { NextResponse } from 'next/server';
import { getTable, updateRecord, auditLog } from '@/lib/db';

export async function POST(request) {
  try {
    const { employee_id, user_id } = await request.json();

    if (!employee_id) {
      return NextResponse.json({ error: 'employee_id مطلوب' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const attendance = await getTable('attendance');
    const todayRecord = attendance.find(a => a.employee_id === employee_id && a.date === today);

    if (!todayRecord) {
      return NextResponse.json({ error: 'لا يوجد سجل حضور لهذا اليوم. يجب تسجيل الدخول أولاً.' }, { status: 404 });
    }

    if (todayRecord.check_out) {
      return NextResponse.json({ error: 'تم تسجيل الانصراف مسبقاً لهذا اليوم.' }, { status: 409 });
    }

    // Calculate hours worked
    const checkInTime = new Date(todayRecord.check_in.replace(' ', 'T'));
    const checkOutTime = new Date();
    const totalHours = parseFloat(((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2));
    const standardHours = 8;
    const overtimeHours = parseFloat(Math.max(0, totalHours - standardHours).toFixed(2));

    await updateRecord('attendance', todayRecord.attendance_id, {
      check_out: now,
      total_hours: totalHours,
      overtime_hours: overtimeHours,
      updated_at: now
    }, user_id || 1);

    await auditLog(user_id || 1, 'attendance', 'checkout', todayRecord.attendance_id, {
      check_out: now,
      total_hours: totalHours,
      overtime_hours: overtimeHours
    });

    return NextResponse.json({
      success: true,
      message: `تم تسجيل الانصراف بنجاح. إجمالي الساعات: ${totalHours} ساعة${overtimeHours > 0 ? ` (إضافي: ${overtimeHours} ساعة)` : ''}.`,
      check_out: now,
      total_hours: totalHours,
      overtime_hours: overtimeHours,
    });

  } catch (err) {
    console.error('Check-out Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
