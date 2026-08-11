import { NextResponse } from 'next/server';
import { getTable } from '@/lib/db';
import { verifySession } from '@/lib/serverAuth';
import { sameDay, sameMonth, dateKey } from '@/lib/dates';

const WORK_HOURS_PER_DAY = 8;
const WORK_DAYS_PER_MONTH = 22;

export async function GET(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    const employeeIdNum = Number(employeeId);

    if (!employeeId || isNaN(employeeIdNum)) {
      return NextResponse.json({ error: 'employeeId required' }, { status: 400 });
    }

    const employees = await getTable('employees');
    const emp = employees.find(e => e.employee_id === employeeIdNum);

    // Users can only view their own dashboard (unless privileged)
    if (emp && emp.user_id !== user.user_id) {
      const roles = await getTable('roles');
      const role = roles.find(r => r.role_id === user.role_id);
      const roleKey = (user.role_name || role?.role_name || '').toLowerCase();
      if (!['admin', 'hr', 'fm', 'ceo'].includes(roleKey)) {
        return NextResponse.json({ error: 'غير مصرح — لا يمكنك عرض لوحة موظف آخر' }, { status: 403 });
      }
    }

    const [attendance, attendance_logs, tasks, leaves, salaries, deductions, notifications, announcements, allEmployees] = await Promise.all([
      getTable('attendance'),
      getTable('attendance_logs'),
      getTable('tasks'),
      getTable('leaves'),
      getTable('salaries'),
      getTable('deduction_proposals'),
      getTable('notifications'),
      getTable('announcements'),
      getTable('employees'),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    const employee = allEmployees.find(e => e.employee_id === employeeIdNum || String(e.employee_id) === String(employeeId));
    const employeeUserId = employee?.user_id;

    // Today attendance
    const todayAttendance = attendance.find(a => (a.employee_id === employeeIdNum || String(a.employee_id) === String(employeeId)) && sameDay(a.date, today));

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
    const monthAttendance = attendance.filter(a => (a.employee_id === employeeIdNum || String(a.employee_id) === String(employeeId)) && sameMonth(a.date, currentMonth));

    const monthTotalHours = monthAttendance.reduce((s, a) => s + (Number(a.total_hours) || 0), 0);
    const monthAbsentHours = monthAttendance.reduce((s, a) => s + (Number(a.absent_hours) || 0), 0);

    // Tasks - categorize for productivity
    const myTasks = tasks.filter(t => t.assigned_to === employeeIdNum || String(t.assigned_to) === String(employeeId));
    const monthTasks = myTasks.filter(t => {
      const created = sameMonth(t.created_at, currentMonth);
      const deadline = sameMonth(t.deadline, currentMonth);
      return created || deadline;
    });

    const completedTasks = monthTasks.filter(t => t.status === 'completed');
    const uncompletedTasks = monthTasks.filter(t => {
      if (t.status === 'completed') return false;
      const deadline = dateKey(t.deadline);
      return deadline && deadline.slice(0, 7) <= currentMonth;
    });
    const delayedTasks = monthTasks.filter(t => t.is_delayed === true || t.is_delayed === 'true');

    const taskStats = {
      total: myTasks.length,
      completed: myTasks.filter(t => t.status === 'completed').length,
      in_progress: myTasks.filter(t => t.status === 'in_progress').length,
      new: myTasks.filter(t => t.status === 'new').length,
      delayed: delayedTasks.length,
      uncompleted: uncompletedTasks.length,
      productivityRate: monthTasks.length > 0
        ? Math.round((completedTasks.length / monthTasks.length) * 100)
        : 100,
    };

    // Deductions calculation
    const salaryType = employee?.salary_type || 'monthly';
    const hourlyRate = Number(employee?.hourly_rate) || 0;
    const basicSalary = Number(employee?.basic_salary) || 0;

    // Hourly employees are already paid only for worked hours
    // (gross = monthTotalHours × hourlyRate), so deducting absent hours
    // again would double-penalize — same rule as payroll.js.
    const hourlyRateForAbsence = salaryType === 'hourly'
      ? 0
      : basicSalary / (WORK_DAYS_PER_MONTH * WORK_HOURS_PER_DAY);

    const attendanceDeductions = monthAbsentHours * hourlyRateForAbsence;
    const taskDeductions = uncompletedTasks.reduce((sum, t) => sum + (Number(t.deduction_value) || 0), 0);
    const totalDeductions = attendanceDeductions + taskDeductions;

    let grossSalary = 0;
    if (salaryType === 'hourly') {
      grossSalary = monthTotalHours * hourlyRate;
    } else {
      grossSalary = basicSalary;
    }
    const allowances = Number(employee?.allowances) || 0;
    const netSalary = Math.max(0, grossSalary + allowances - totalDeductions);

    // Salary
    const latestSalary = salaries.filter(s => s.employee_id === employeeIdNum || String(s.employee_id) === String(employeeId)).sort((a, b) => b.month.localeCompare(a.month))[0];

    // Pending deductions
    const pendingDeductions = deductions.filter(d => (d.employee_id === employeeIdNum || String(d.employee_id) === String(employeeId)) && d.status === 'draft');

    // Pending leaves
    const pendingLeaves = leaves.filter(l => (l.employee_id === employeeIdNum || String(l.employee_id) === String(employeeId)) && l.status === 'pending');

    // Notifications - only for this employee's user_id
    const myNotifs = employeeUserId
      ? notifications.filter(n => n.user_id === employeeUserId && n.is_read === false)
      : [];

    return NextResponse.json({
      todayAttendance,
      hourlySlots,
      monthAttendance: {
        total: monthAttendance.length,
        present: monthAttendance.filter(a => a.status !== 'absent').length,
        late: monthAttendance.filter(a => a.is_late === true).length,
        absent: monthAttendance.filter(a => a.status === 'absent').length,
        totalHours: monthTotalHours,
        absentHours: monthAbsentHours,
      },
      taskStats,
      productivity: {
        totalTasks: monthTasks.length,
        completed: completedTasks.length,
        uncompleted: uncompletedTasks.length,
        delayed: delayedTasks.length,
        productivityRate: taskStats.productivityRate,
      },
      payroll: {
        salary_type: salaryType,
        hourly_rate: hourlyRate,
        gross_salary: grossSalary,
        allowances: allowances,
        attendance_deductions: Math.round(attendanceDeductions * 100) / 100,
        task_deductions: taskDeductions,
        total_deductions: Math.round(totalDeductions * 100) / 100,
        net_salary: Math.round(netSalary * 100) / 100,
      },
      myTasks: myTasks.slice(0, 5),
      latestSalary,
      pendingDeductions,
      pendingLeaves,
      notifications: myNotifs,
      announcements: announcements.filter(a => !a.expires_at || new Date(a.expires_at) > new Date()),
    });
  } catch (err) {
    console.error('Dashboard Employee Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
