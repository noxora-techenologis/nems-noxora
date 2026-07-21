import { NextResponse } from 'next/server';
import { getTable, insertRecord, updateRecord, auditLog } from '@/lib/db';

export async function POST(request) {
  try {
    const { employee_id, user_id } = await request.json();

    if (!employee_id) {
      return NextResponse.json({ error: 'employee_id مطلوب' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const attendance = await getTable('attendance');
    const attendance_logs = await getTable('attendance_logs');

    // Check existing attendance for today
    let todayRecord = attendance.find(a => a.employee_id === employee_id && a.date === today);

    if (!todayRecord) {
      // First check-in today: create attendance record
      todayRecord = {
        employee_id,
        date: today,
        check_in: now,
        check_out: null,
        total_hours: 0,
        overtime_hours: 0,
        status: 'present',
        notes: 'تسجيل حضور بواسطة النظام',
      };
      todayRecord = await insertRecord('attendance', todayRecord, user_id || 1);
    }

    // Check how many hourly slots are already confirmed today
    const todayLogs = attendance_logs.filter(l => l.attendance_id === todayRecord.attendance_id);
    const nextSlot = todayLogs.length + 1;

    if (nextSlot > 8) {
      return NextResponse.json({ error: 'تم تسجيل جميع البصمات اليومية الثماني بنجاح.' }, { status: 409 });
    }

    // Create hourly log
    const logRecord = {
      employee_id,
      attendance_id: todayRecord.attendance_id,
      timestamp: now,
      hour_slot: nextSlot,
      status: 'confirmed',
      device: '💻 Web App',
      location: 'المكتب الرئيسي',
    };

    await insertRecord('attendance_logs', logRecord, user_id || 1);

    // Update total_hours on the attendance record
    const currentHour = new Date().getHours();
    const checkInHour = todayRecord.check_in ? new Date(todayRecord.check_in.replace(' ', 'T')).getHours() : currentHour;
    const totalHours = parseFloat((currentHour - checkInHour).toFixed(2));

    await updateRecord('attendance', todayRecord.attendance_id, {
      total_hours: Math.max(0, totalHours),
      updated_at: now
    }, user_id || 1);

    return NextResponse.json({
      success: true,
      message: `تم تسجيل البصمة ${nextSlot} من 8 بنجاح.`,
      slot: nextSlot,
      timestamp: now,
    });

  } catch (err) {
    console.error('Check-in Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
