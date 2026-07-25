import { NextResponse } from 'next/server';
import { getTable, insertRecord, updateRecord, query } from '@/lib/db';
import { calculateMonthlyPayroll } from '@/lib/payroll';
import { verifySession, requireRole } from '@/lib/serverAuth';

/**
 * GET /api/payroll/auto?month=2026-07
 * Returns calculated payroll for all active employees (read-only preview).
 * Accessible by: FM, CEO, Owner (read), Admin
 */
export async function GET(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const roleErr = requireRole(user, ['fm', 'ceo', 'admin']);
    if (roleErr) return roleErr;

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7);

    const [employees, attendance, tasks, departments, salaries] = await Promise.all([
      getTable('employees'),
      getTable('attendance'),
      getTable('tasks'),
      getTable('departments'),
      getTable('salaries'),
    ]);

    const { employees: payrollResults, totals } = calculateMonthlyPayroll(employees, attendance, tasks, month);

    // Enrich with department names and existing salary record status
    for (const emp of payrollResults) {
      const dept = departments.find(d => d.department_id === emp.department_id);
      emp.department_name = dept?.name || '';

      const existingSalary = salaries.find(s =>
        s.employee_id === emp.employee_id && s.month === month
      );
      emp.salary_record_exists = !!existingSalary;
      emp.salary_status = existingSalary?.status || null;
      emp.salary_id = existingSalary?.salary_id || null;
      emp.payment_status = existingSalary?.payment_status || null;
    }

    return NextResponse.json({ month, employees: payrollResults, totals });
  } catch (err) {
    console.error('Payroll Auto GET Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}

/**
 * POST /api/payroll/auto
 * Body: { month: '2026-07', action: 'generate' | 'confirm_payment' }
 * Only FM/Admin can generate or confirm payments.
 */
export async function POST(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const roleErr = requireRole(user, ['fm', 'admin']);
    if (roleErr) return roleErr;

    const body = await request.json();
    const { month, action } = body;

    if (!month) {
      return NextResponse.json({ error: 'الشهر مطلوب (YYYY-MM)' }, { status: 400 });
    }

    if (action === 'generate') {
      return await handleGenerate(month, user.user_id);
    }

    if (action === 'confirm_payment') {
      return await handleConfirmPayment(month, user.user_id);
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (err) {
    console.error('Payroll Auto POST Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}

async function handleGenerate(month, userId) {
  const [employees, attendance, tasks, salaries] = await Promise.all([
    getTable('employees'),
    getTable('attendance'),
    getTable('tasks'),
    getTable('salaries'),
  ]);

  const { employees: payrollResults } = calculateMonthlyPayroll(employees, attendance, tasks, month);

  let created = 0;
  let updated = 0;

  for (const emp of payrollResults) {
    const existing = salaries.find(s =>
      s.employee_id === emp.employee_id && s.month === month
    );

    const record = {
      employee_id: emp.employee_id,
      month,
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
      // Do NOT overwrite if already paid
      if (existing.status === 'paid') continue;
      await updateRecord('salaries', existing.salary_id, record, userId || 1);
      updated++;
    } else {
      await insertRecord('salaries', record, userId || 1);
      created++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `تم إنشاء ${created} سجل راتب وتحديث ${updated} سجل.`,
    created,
    updated,
  });
}

async function handleConfirmPayment(month, userId) {
  const salaries = await getTable('salaries');
  const monthSalaries = salaries.filter(s => s.month === month && s.status !== 'paid');

  if (monthSalaries.length === 0) {
    return NextResponse.json({ error: 'لا توجد رواتب معلقة للصرف في هذا الشهر.' }, { status: 400 });
  }

  const totalAmount = monthSalaries.reduce((sum, s) => sum + (Number(s.net_salary) || 0), 0);
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const today = new Date().toISOString().split('T')[0];

  // 1. Mark all salaries as paid
  let paidCount = 0;
  for (const sal of monthSalaries) {
    await updateRecord('salaries', sal.salary_id, {
      status: 'paid',
      payment_status: 'paid',
      paid_at: now,
      updated_at: now,
    }, userId || 1);
    paidCount++;
  }

  // 2. Post total to expenses table
  const expenseRecord = await insertRecord('expenses', {
    amount: totalAmount,
    title: `رواتب موظفي شهر ${month}`,
    description: `صرف رواتب ${paidCount} موظف لشهر ${month} — إجمالي صافي الرواتب`,
    category: 'رواتب',
    currency: 'MRU',
    date: today,
    status: 'approved',
    approved_by: userId || 1,
    approved_at: now,
    created_by: userId || 1,
  }, userId || 1);

  // 3. Update company_valuation (increase total_expenses / reduce valuation)
  const valuations = await getTable('company_valuation');
  if (valuations.length > 0) {
    const val = valuations[0];
    const currentRetained = Number(val.retained_earnings) || 0;
    const newRetained = Math.max(0, currentRetained - totalAmount);

    await updateRecord('company_valuation', val.valuation_id, {
      retained_earnings: newRetained,
      updated_at: now,
    }, userId || 1);
  }

  return NextResponse.json({
    success: true,
    message: `تم صرف رواتب ${paidCount} موظف بنجاح. إجمالي المبلغ: ${totalAmount} MRU. تم تسجيله كمصروف عام.`,
    paid_count: paidCount,
    total_amount: totalAmount,
    expense_id: expenseRecord?.expense_id,
  });
}
