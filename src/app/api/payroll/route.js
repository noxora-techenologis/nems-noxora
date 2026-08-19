import { NextResponse } from 'next/server';
import { getTable, insertRecord, updateRecord } from '@/lib/db';
import { verifySession, requireRole } from '@/lib/serverAuth';
import { calculateMonthlyPayroll } from '@/lib/payroll';

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

    const filteredEmployees = employeeId
      ? employees.filter(e => e.employee_id === Number(employeeId))
      : employees;

    const { employees: calculatedResults, totals } = calculateMonthlyPayroll(filteredEmployees, attendance, tasks, month);

    const results = calculatedResults.map(r => {
      const existingSalary = salaries.find(s =>
        s.employee_id === r.employee_id && s.month === month
      );
      const department = departments.find(d => d.department_id === r.department_id);

      return {
        ...r,
        department: department?.name || '',
        salary_record_exists: !!existingSalary,
        salary_status: existingSalary?.status || null,
        salary_id: existingSalary?.salary_id || null,
      };
    });

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
