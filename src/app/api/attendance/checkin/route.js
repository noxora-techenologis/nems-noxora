import { NextResponse } from 'next/server';
import { getTable, insertRecord, updateRecord, query, auditLog } from '@/lib/db';
import { verifySession } from '@/lib/serverAuth';
import { sameDay } from '@/lib/dates';

// Work hours: 08:00 - 17:00 = 8 hourly slots
const WORK_START_HOUR = 8;
const MAX_SLOTS = 8;
const SLOT_DURATION_MS = 60 * 60 * 1000; // 1 hour

function getCurrentSlot(now) {
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutesSinceStart = (hour - WORK_START_HOUR) * 60 + minute;
  if (totalMinutesSinceStart < 0) return 0;
  return Math.floor(totalMinutesSinceStart / 60) + 1;
}

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
    const attendance_logs = await getTable('attendance_logs');

    let todayRecord = attendance.find(a => a.employee_id === employee_id && sameDay(a.date, today));

    if (!todayRecord) {
      todayRecord = await insertRecord('attendance', {
        employee_id,
        date: today,
        check_in: nowStr,
        check_out: null,
        total_hours: 0,
        overtime_hours: 0,
        absent_hours: 0,
        confirmed_slots: 0,
        status: 'present',
        notes: 'تسجيل حضور بواسطة النظام',
      }, user_id || 1);
    }

    const todayLogs = attendance_logs.filter(l => l.attendance_id === todayRecord.attendance_id);

    if (todayLogs.length >= MAX_SLOTS) {
      return NextResponse.json({ error: 'تم تسجيل جميع البصمات اليومية الثماني بنجاح.' }, { status: 409 });
    }

    const currentSlot = getCurrentSlot(now);

    if (currentSlot <= 0 || currentSlot > MAX_SLOTS) {
      return NextResponse.json({ error: 'خارج ساعات الدوام الرسمية (08:00 - 17:00)' }, { status: 400 });
    }

    const alreadyConfirmed = todayLogs.find(l => l.hour_slot === currentSlot);
    if (alreadyConfirmed) {
      return NextResponse.json({ error: `البصمة ${currentSlot} تم تسجيلها بالفعل.` }, { status: 409 });
    }

    const logRecord = await insertRecord('attendance_logs', {
      employee_id,
      attendance_id: todayRecord.attendance_id,
      timestamp: nowStr,
      hour_slot: currentSlot,
      status: 'confirmed',
      device: '💻 Web App',
      location: 'المكتب الرئيسي',
    }, user_id || 1);

    const updatedLogsCount = todayLogs.length + 1;
    const totalHours = updatedLogsCount;

    const absentHours = Math.max(0, MAX_SLOTS - updatedLogsCount);
    const isLate = todayLogs.length === 0 && now.getHours() > WORK_START_HOUR + 1;

    await updateRecord('attendance', todayRecord.attendance_id, {
      total_hours: totalHours,
      confirmed_slots: updatedLogsCount,
      absent_hours: absentHours,
      overtime_hours: Math.max(0, totalHours - MAX_SLOTS),
      is_late: isLate,
      status: totalHours >= MAX_SLOTS ? 'present' : 'present',
      updated_at: nowStr,
    }, user_id || 1);

    return NextResponse.json({
      success: true,
      message: `تم تسجيل البصمة ${updatedLogsCount} من 8 بنجاح. الساعة ${currentSlot}.`,
      slot: currentSlot,
      totalSlots: updatedLogsCount,
      timestamp: nowStr,
    });

  } catch (err) {
    console.error('Check-in Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
