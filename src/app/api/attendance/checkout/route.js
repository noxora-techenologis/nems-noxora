import { NextResponse } from 'next/server';
import { getTable, updateRecord, auditLog } from '@/lib/db';
import { verifySession } from '@/lib/serverAuth';

const MAX_SLOTS = 8;
const MIN_SLOTS_REQUIRED = 2;

export async function POST(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const { employee_id, user_id } = await request.json();

    if (!employee_id) {
      return NextResponse.json({ error: 'employee_id مطلوب' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const nowStr = now.toISOString().replace('T', ' ').substring(0, 19);

    const attendance = await getTable('attendance');
    const todayRecord = attendance.find(a => a.employee_id === employee_id && a.date === today);

    if (!todayRecord) {
      return NextResponse.json({ error: 'لا يوجد سجل حضور لهذا اليوم. يجب تسجيل الدخول أولاً.' }, { status: 404 });
    }

    if (todayRecord.check_out) {
      return NextResponse.json({ error: 'تم تسجيل الانصراف مسبقاً لهذا اليوم.' }, { status: 409 });
    }

    const attendance_logs = await getTable('attendance_logs');
    const todayLogs = attendance_logs.filter(l => l.attendance_id === todayRecord.attendance_id);
    const confirmedSlots = todayLogs.length;

    const totalHours = confirmedSlots;
    const overtimeHours = Math.max(0, totalHours - MAX_SLOTS);
    let absentHours = Math.max(0, MAX_SLOTS - confirmedSlots);

    // RULE: If confirmed slots < 2, entire day counts as absent (8 hrs)
    // This must match payroll.js engine behavior
    if (confirmedSlots < MIN_SLOTS_REQUIRED) {
      absentHours = MAX_SLOTS;
    }

    let status = 'present';
    let statusMessage = '';

    if (confirmedSlots < MIN_SLOTS_REQUIRED) {
      status = 'absent';
      statusMessage = ` ⚠️ يوم غياب تلقائي: الحد الأدنى ساعتان (${confirmedSlots} بصمة فقط من 8).`;
    } else if (totalHours >= MAX_SLOTS) {
      status = 'present';
      statusMessage = ` ✓ يوم عمل كامل ${totalHours} ساعات.`;
    } else {
      status = 'present';
      statusMessage = ` ✓ ${totalHours} ساعات عمل محتسبة، ${absentHours} ساعات غياب.`;
    }

    await updateRecord('attendance', todayRecord.attendance_id, {
      check_out: nowStr,
      total_hours: totalHours,
      overtime_hours: overtimeHours,
      absent_hours: absentHours,
      confirmed_slots: confirmedSlots,
      status: status,
      updated_at: nowStr,
    }, user_id || 1);

    await auditLog(user_id || 1, 'checkout', 'Attendance', 'attendance', todayRecord.attendance_id, null, {
      check_out: nowStr,
      total_hours: totalHours,
      overtime_hours: overtimeHours,
      absent_hours: absentHours,
      confirmed_slots: confirmedSlots,
      status: status,
    });

    return NextResponse.json({
      success: true,
      message: `تم تسجيل الانصراف بنجاح. ${totalHours} ساعات عمل.${statusMessage}`,
      check_out: nowStr,
      total_hours: totalHours,
      overtime_hours: overtimeHours,
      absent_hours: absentHours,
      confirmed_slots: confirmedSlots,
      status: status,
    });

  } catch (err) {
    console.error('Check-out Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
