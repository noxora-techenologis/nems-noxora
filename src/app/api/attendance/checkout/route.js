import { NextResponse } from 'next/server';
import { getTable, updateRecord, auditLog, query } from '@/lib/db';
import { verifySession } from '@/lib/serverAuth';
import { sameDay } from '@/lib/dates';

const MAX_SLOTS = 8;
const MIN_SLOTS_REQUIRED = 2;

export async function POST(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    // SECURITY: employee is resolved from the authenticated session user.
    const employees = await getTable('employees');
    const emp = employees.find(e => e.user_id === user.user_id);
    if (!emp) {
      return NextResponse.json({ error: 'لا يوجد موظف مرتبط بحسابك.' }, { status: 403 });
    }
    const employee_id = emp.employee_id;
    const userId = user.user_id;

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const nowStr = now.toISOString().replace('T', ' ').substring(0, 19);

    // Use targeted query instead of full table scan
    const todayRecord = await query(
      `SELECT * FROM "attendance" WHERE "employee_id" = $1 AND "date" = $2`,
      [employee_id, today]
    );
    const record = todayRecord[0];

    if (!record) {
      return NextResponse.json({ error: 'لا يوجد سجل حضور لهذا اليوم. يجب تسجيل الدخول أولاً.' }, { status: 404 });
    }

    if (record.check_out) {
      return NextResponse.json({ error: 'تم تسجيل الانصراف مسبقاً لهذا اليوم.' }, { status: 409 });
    }

    // Use targeted query instead of full table scan
    const confirmedLogs = await query(
      `SELECT COUNT(*) AS c FROM "attendance_logs" WHERE "attendance_id" = $1 AND "status" = 'confirmed'`,
      [record.attendance_id]
    );
    const confirmedSlots = Math.min(Number(confirmedLogs[0].c), MAX_SLOTS);

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

    await updateRecord('attendance', record.attendance_id, {
      check_out: nowStr,
      total_hours: totalHours,
      overtime_hours: overtimeHours,
      absent_hours: absentHours,
      confirmed_slots: confirmedSlots,
      status: status,
      updated_at: nowStr,
    }, userId);

    await auditLog(userId, 'checkout', 'Attendance', 'attendance', record.attendance_id, null, {
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
