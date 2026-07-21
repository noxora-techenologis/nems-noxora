import { NextResponse } from 'next/server';
import { getTable } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId required' }, { status: 400 });
    }

    const [attendance, attendance_logs, tasks, leaves, salaries, deductions, notifications, announcements] = await Promise.all([
      getTable('attendance'),
      getTable('attendance_logs'),
      getTable('tasks'),
      getTable('leaves'),
      getTable('salaries'),
      getTable('deduction_proposals'),
      getTable('notifications'),
      getTable('announcements'),
    ]);

    const today = new Date().toISOString().split('T')[0];

    // Today attendance
    const todayAttendance = attendance.find(a => a.employee_id === employeeId && a.date === today);

    // Today hourly logs
    const todayLogs = todayAttendance
      ? attendance_logs.filter(l => l.attendance_id === todayAttendance.attendance_id)
      : [];

    // Build 8-slot hourly grid
    const hourlySlots = Array.from({ length: 8 }, (_, i) => {
      const slot = i + 1;
      const log = todayLogs.find(l => l.hour_slot === slot);
      return {
        slot,
        status: log ? log.status : (todayAttendance ? 'missing' : 'empty'),
        timestamp: log?.timestamp || null,
        device: log?.device || null,
      };
    });

    // This month attendance summary
    const currentMonth = today.substring(0, 7);
    const monthAttendance = attendance.filter(a => a.employee_id === employeeId && a.date?.startsWith(currentMonth));

    // Tasks
    const myTasks = tasks.filter(t => t.assigned_to === employeeId);
    const taskStats = {
      total: myTasks.length,
      completed: myTasks.filter(t => t.status === 'completed').length,
      in_progress: myTasks.filter(t => t.status === 'in_progress').length,
      new: myTasks.filter(t => t.status === 'new').length,
    };

    // Salary
    const latestSalary = salaries.filter(s => s.employee_id === employeeId).sort((a, b) => b.month.localeCompare(a.month))[0];

    // Pending deductions
    const pendingDeductions = deductions.filter(d => d.employee_id === employeeId && d.status === 'draft');

    // Pending leaves
    const pendingLeaves = leaves.filter(l => l.employee_id === employeeId && l.status === 'pending');

    // Notifications
    const myNotifs = notifications.filter(n => n.user_id && n.is_read === false);

    return NextResponse.json({
      todayAttendance,
      hourlySlots,
      monthAttendance: {
        total: monthAttendance.length,
        present: monthAttendance.filter(a => a.status === 'present').length,
        late: monthAttendance.filter(a => a.status === 'late').length,
        absent: monthAttendance.filter(a => a.status === 'absent').length,
        totalHours: monthAttendance.reduce((s, a) => s + (a.total_hours || 0), 0),
      },
      taskStats,
      myTasks: myTasks.slice(0, 5),
      latestSalary,
      pendingDeductions,
      pendingLeaves,
      announcements: announcements.filter(a => !a.expires_at || new Date(a.expires_at) > new Date()),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
