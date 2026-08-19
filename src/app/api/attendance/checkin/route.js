import { NextResponse } from 'next/server';
import { getTable, query, updateRecord, auditLog } from '@/lib/db';
import { verifySession } from '@/lib/serverAuth';

// Work hours: 08:00 - 16:00 = 8 hourly slots
const WORK_START_HOUR = 8;
const MAX_SLOTS = 8;

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

    // SECURITY: employee is resolved from the authenticated session user —
    // never from the request body (prevents checking in on behalf of others).
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

    // Race-safe: ensure today's attendance row exists (unique employee_id + date).
    // ON CONFLICT DO NOTHING means concurrent first-check-ins collapse to one row.
    const attInsert = await query(
      `INSERT INTO "attendance" ("employee_id","date","check_in","check_out","total_hours","overtime_hours","absent_hours","confirmed_slots","status","notes","created_at")
       VALUES ($1,$2,$3,NULL,0,0,0,0,'present',$4,$5)
       ON CONFLICT ("employee_id","date") DO NOTHING
       RETURNING *`,
      [employee_id, today, nowStr, 'تسجيل حضور بواسطة النظام', nowStr]
    );

    let todayRecord;
    if (attInsert.length > 0) {
      todayRecord = attInsert[0];
      auditLog(userId, 'create', 'Attendance', 'attendance', todayRecord.attendance_id, null, todayRecord).catch(err => console.error('Audit log failed:', err));
    } else {
      const existing = await query(
        `SELECT * FROM "attendance" WHERE "employee_id" = $1 AND "date" = $2`,
        [employee_id, today]
      );
      todayRecord = existing[0];
    }

    const logCountRes = await query(
      `SELECT COUNT(*) AS c FROM "attendance_logs" WHERE "attendance_id" = $1`,
      [todayRecord.attendance_id]
    );
    const existingLogCount = Number(logCountRes[0].c);

    if (existingLogCount >= MAX_SLOTS) {
      return NextResponse.json({ error: 'تم تسجيل جميع البصمات اليومية الثماني بنجاح.' }, { status: 409 });
    }

    const currentSlot = getCurrentSlot(now);

    if (currentSlot <= 0 || currentSlot > MAX_SLOTS) {
      return NextResponse.json({ error: 'خارج ساعات الدوام الرسمية (08:00 - 16:00)' }, { status: 400 });
    }

    // Race-safe: unique (attendance_id, hour_slot) — a concurrent request for the
    // same slot returns no row, which we treat as "already confirmed".
    const logResult = await query(
      `INSERT INTO "attendance_logs" ("employee_id","attendance_id","timestamp","hour_slot","status","device","location","updated_at")
       VALUES ($1,$2,$3,$4,'confirmed',$5,$6,$7)
       ON CONFLICT ("attendance_id","hour_slot") DO NOTHING
       RETURNING *`,
      [employee_id, todayRecord.attendance_id, nowStr, currentSlot, '💻 Web App', 'المكتب الرئيسي', nowStr]
    );

    if (logResult.length === 0) {
      return NextResponse.json({ error: `البصمة ${currentSlot} تم تسجيلها بالفعل.` }, { status: 409 });
    }

    auditLog(userId, 'checkin', 'Attendance', 'attendance_logs', logResult[0].log_id, null, logResult[0]).catch(err => console.error('Audit log failed:', err));

    const updatedLogsCount = existingLogCount + 1;
    const totalHours = updatedLogsCount;
    const absentHours = Math.max(0, MAX_SLOTS - updatedLogsCount);

    const updates = {
      total_hours: totalHours,
      confirmed_slots: updatedLogsCount,
      absent_hours: absentHours,
      overtime_hours: 0,
      status: 'present',
    };
    // is_late is decided by the FIRST check-in of the day only; later check-ins
    // must NOT overwrite it.
    if (existingLogCount === 0) {
      updates.is_late = now.getHours() > WORK_START_HOUR + 1;
    }

    await updateRecord('attendance', todayRecord.attendance_id, updates, userId);

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
