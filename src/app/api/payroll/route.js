import { NextResponse } from 'next/server';
import { getTable, insertRecord, updateRecord, query } from '@/lib/db';
import { verifySession, requireRole } from '@/lib/serverAuth';
import { sameMonth, dateKey } from '@/lib/dates';

const WORK_HOURS_PER_DAY = 8;
const WORK_DAYS_PER_MONTH = 22;

// GET: Calculate payroll for current or specified month
// GET /api/payroll?month=2026-07&employeeId=1
export async function GET(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const roleErr = await requireRole(user, ['ceo', 'admin', 'hr', 'fm']);
    if (roleErr) return roleErr;

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7);
    const employeeId = searchParams.get('employeeId');

    const [employees, attendance, tasks, salaries, departments] = await Promise.all([
      getTable('employees'),
      getTable('attendance'),
      getTable('tasks'),
      getTable('salaries'),
      getTable('departments'),
    ]);

    const targetEmployees = employeeId
      ? employees.filter(e => e.employee_id === Number(employeeId))
      : employees.filter(e => e.employment_status === 'active');

    const results = [];

    for (const emp of targetEmployees) {
      const empAttendance = attendance.filter(a =>
        a.employee_id === emp.employee_id && sameMonth(a.date, month)
      );

      const totalDaysWorked = empAttendance.length;
      const presentDays = empAttendance.filter(a => a.status !== 'absent').length;
      const absentDays = empAttendance.filter(a => a.status === 'absent').length;

      const totalHoursWorked = empAttendance.reduce((sum, a) => sum + (Number(a.total_hours) || 0), 0);
      const totalAbsentHours = empAttendance.reduce((sum, a) => sum + (Number(a.absent_hours) || 0), 0);
      const totalOvertimeHours = empAttendance.reduce((sum, a) => sum + (Number(a.overtime_hours) || 0), 0);

      const empTasks = tasks.filter(t => t.assigned_to === emp.employee_id);
      const monthTasks = empTasks.filter(t => {
        const created = sameMonth(t.created_at, month);
        const deadline = sameMonth(t.deadline, month);
        return created || deadline;
      });

      const completedTasks = monthTasks.filter(t => t.status === 'completed');
      const uncompletedTasks = monthTasks.filter(t => t.status !== 'completed' && dateKey(t.deadline).slice(0, 7) <= month);
      const delayedTasks = monthTasks.filter(t => t.is_delayed === true || t.is_delayed === 'true');

      const taskDeductions = uncompletedTasks.reduce((sum, t) => sum + (Number(t.deduction_value) || 0), 0);

      const salaryType = emp.salary_type || 'monthly';
      const hourlyRate = Number(emp.hourly_rate) || 0;
      const basicSalary = Number(emp.basic_salary) || 0;
      const allowances = Number(emp.allowances) || 0;

      let grossSalary = 0;
      if (salaryType === 'hourly') {
        grossSalary = totalHoursWorked * hourlyRate;
      } else {
        grossSalary = basicSalary;
      }

      const hourlyRateForAbsence = salaryType === 'hourly'
        ? hourlyRate
        : basicSalary / (WORK_DAYS_PER_MONTH * WORK_HOURS_PER_DAY);

      const attendanceDeductions = totalAbsentHours * hourlyRateForAbsence;
      const totalDeductions = attendanceDeductions + taskDeductions;
      const netSalary = Math.max(0, grossSalary + allowances - totalDeductions);

      const existingSalary = salaries.find(s =>
        s.employee_id === emp.employee_id && s.month === month
      );

      const department = departments.find(d => d.department_id === emp.department_id);

      results.push({
        employee_id: emp.employee_id,
        employee_name: emp.name,
        job_title: emp.job_title,
        department: department?.name || '',
        salary_type: salaryType,
        hourly_rate: hourlyRate,
        basic_salary: basicSalary,
        allowances: allowances,
        total_hours_worked: totalHoursWorked,
        total_absent_hours: totalAbsentHours,
        total_overtime_hours: totalOvertimeHours,
        total_days_worked: totalDaysWorked,
        present_days: presentDays,
        absent_days: absentDays,
        total_tasks: monthTasks.length,
        completed_tasks: completedTasks.length,
        uncompleted_tasks: uncompletedTasks.length,
        delayed_tasks: delayedTasks.length,
        gross_salary: grossSalary,
        attendance_deductions: Math.round(attendanceDeductions * 100) / 100,
        task_deductions: taskDeductions,
        total_deductions: Math.round(totalDeductions * 100) / 100,
        net_salary: Math.round(netSalary * 100) / 100,
        salary_record_exists: !!existingSalary,
        salary_status: existingSalary?.status || null,
        salary_id: existingSalary?.salary_id || null,
      });
    }

    const totals = {
      total_gross: results.reduce((s, r) => s + r.gross_salary, 0),
      total_deductions: results.reduce((s, r) => s + r.total_deductions, 0),
      total_net: results.reduce((s, r) => s + r.net_salary, 0),
      employee_count: results.length,
    };

    return NextResponse.json({ month, employees: results, totals });
  } catch (err) {
    console.error('Payroll GET Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}

// POST: Generate salary records for a month (CEO/FM only)
// POST /api/payroll { month: '2026-07', employee_ids: [1,2,3] }
export async function POST(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const roleErr = await requireRole(user, ['ceo', 'admin', 'fm']);
    if (roleErr) return roleErr;

    const body = await request.json();
    const { month, employee_ids, _userId } = body;

    if (!month) {
      return NextResponse.json({ error: 'الشهر مطلوب (YYYY-MM)' }, { status: 400 });
    }

    // Reuse GET logic to calculate payroll
    const calcUrl = new URL(request.url);
    calcUrl.searchParams.set('month', month);
    const calcRes = await GET(new Request(calcUrl.toString()));
    const calcData = await calcRes.json();

    if (calcData.error) {
      return NextResponse.json({ error: calcData.error }, { status: 500 });
    }

    const salaries = await getTable('salaries');
    let created = 0;
    let updated = 0;

    for (const emp of calcData.employees) {
      if (employee_ids && !employee_ids.includes(emp.employee_id)) continue;

      const existing = salaries.find(s =>
        s.employee_id === emp.employee_id && s.month === month
      );

      const record = {
        employee_id: emp.employee_id,
        month: month,
        year: Number(month.split('-')[0]),
        base_salary: emp.gross_salary,
        allowances: emp.allowances,
        deductions: emp.total_deductions,
        bonus: 0,
        net_salary: emp.net_salary,
        currency: 'MRU',
        status: 'pending',
        payment_status: 'pending',
        hours_worked: emp.total_hours_worked,
        absent_hours: emp.total_absent_hours,
        hourly_rate: emp.hourly_rate,
        task_deductions: emp.task_deductions,
        attendance_deductions: emp.attendance_deductions,
        gross_salary: emp.gross_salary,
      };

      if (existing) {
        await updateRecord('salaries', existing.salary_id, record, _userId || 1);
        updated++;
      } else {
        await insertRecord('salaries', record, _userId || 1);
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم إنشاء ${created} سجل راتب وتحديث ${updated} سجل موجود.`,
      created,
      updated,
      totals: calcData.totals,
    });
  } catch (err) {
    console.error('Payroll POST Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
