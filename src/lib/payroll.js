/**
 * NEMS Payroll Calculation Engine
 * ================================
 * Standalone, isolated module — does NOT import from any UI components.
 * Safe to modify without risking other features.
 *
 * Net Salary = (Total Attended Hours × Hourly Rate) - Total Deductions
 * Total Deductions = Absent Hours Deduction + Task Failure Penalties
 *
 * Rules:
 *  - Work days per month: 22 (configurable)
 *  - Hours per day: 8
 *  - Expected hours: 22 × 8 = 176
 *  - If daily confirmed slots < 2 → day counts as FULL ABSENCE (8 hrs deducted)
 */

const WORK_HOURS_PER_DAY = 8;
const WORK_DAYS_PER_MONTH = 22;
const EXPECTED_MONTHLY_HOURS = WORK_DAYS_PER_MONTH * WORK_HOURS_PER_DAY; // 176
const MIN_SLOTS_FOR_DAY = 2;

/**
 * Calculate complete payroll for a single employee for a given month.
 *
 * @param {Object} employee - employee record from DB
 * @param {Array}  monthAttendance - attendance records for the month
 * @param {Array}  monthTasks - tasks relevant to the employee for the month
 * @param {string} month - YYYY-MM
 * @returns {Object} detailed payroll breakdown
 */
export function calculateEmployeePayroll(employee, monthAttendance, monthTasks, month) {
  const salaryType = employee.salary_type || 'monthly';
  const hourlyRate = Number(employee.hourly_rate) || 0;
  const basicSalary = Number(employee.basic_salary) || 0;
  const allowances = Number(employee.allowances) || 0;

  // --- 1. Attendance Analysis ---
  const totalDaysWorked = monthAttendance.length;
  const presentDays = monthAttendance.filter(a => a.status !== 'absent').length;
  const absentDays = monthAttendance.filter(a => a.status === 'absent').length;

  // Raw hours from attendance records
  let totalHoursWorked = 0;
  let totalAbsentHours = 0;
  let totalOvertimeHours = 0;

  for (const att of monthAttendance) {
    const confirmedSlots = Number(att.confirmed_slots) || 0;
    const dayTotalHours = Number(att.total_hours) || 0;

    // RULE: If confirmed slots < 2, entire day is absent (8 hrs deducted)
    if (confirmedSlots < MIN_SLOTS_FOR_DAY) {
      totalHoursWorked += 0;
      totalAbsentHours += WORK_HOURS_PER_DAY;
    } else {
      totalHoursWorked += dayTotalHours;
      const absentHrs = Number(att.absent_hours) || 0;
      totalAbsentHours += absentHrs;
    }

    totalOvertimeHours += Number(att.overtime_hours) || 0;
  }

  // --- 2. Task Failure Penalty ---
  const completedTasks = monthTasks.filter(t => t.status === 'completed');
  const uncompletedTasks = monthTasks.filter(t => {
    if (t.status === 'completed') return false;
    const deadline = t.deadline || '';
    // Task is penalized if its deadline has passed and it's not completed
    return deadline && deadline.substring(0, 7) <= month;
  });
  const delayedTasks = monthTasks.filter(t => t.is_delayed === true || t.is_delayed === 'true');

  const taskDeductions = uncompletedTasks.reduce((sum, t) => {
    return sum + (Number(t.deduction_value) || 0);
  }, 0);

  // --- 3. Gross Salary ---
  let grossSalary = 0;
  if (salaryType === 'hourly') {
    grossSalary = totalHoursWorked * hourlyRate;
  } else {
    grossSalary = basicSalary;
  }

  // --- 4. Absent Hours Deduction ---
  const hourlyRateForAbsence = salaryType === 'hourly'
    ? hourlyRate
    : basicSalary / (WORK_DAYS_PER_MONTH * WORK_HOURS_PER_DAY);

  const attendanceDeductions = Math.round(totalAbsentHours * hourlyRateForAbsence * 100) / 100;

  // --- 5. Net Salary ---
  const totalDeductions = Math.round((attendanceDeductions + taskDeductions) * 100) / 100;
  const netSalary = Math.max(0, Math.round((grossSalary + allowances - totalDeductions) * 100) / 100);

  // Productivity
  const productivityRate = monthTasks.length > 0
    ? Math.round((completedTasks.length / monthTasks.length) * 100)
    : 100;

  return {
    employee_id: employee.employee_id,
    employee_name: employee.name,
    job_title: employee.job_title,
    department_id: employee.department_id,
    salary_type: salaryType,
    hourly_rate: hourlyRate,
    basic_salary: basicSalary,
    allowances,

    // Attendance
    total_days_worked: totalDaysWorked,
    present_days: presentDays,
    absent_days: absentDays,
    expected_hours: EXPECTED_MONTHLY_HOURS,
    total_hours_worked: totalHoursWorked,
    total_absent_hours: totalAbsentHours,
    total_overtime_hours: totalOvertimeHours,

    // Tasks
    total_tasks: monthTasks.length,
    completed_tasks: completedTasks.length,
    uncompleted_tasks: uncompletedTasks.length,
    delayed_tasks: delayedTasks.length,
    productivity_rate: productivityRate,

    // Financial
    gross_salary: grossSalary,
    attendance_deductions: attendanceDeductions,
    task_deductions: taskDeductions,
    total_deductions: totalDeductions,
    net_salary: netSalary,
  };
}

/**
 * Calculate full payroll for all active employees in a month.
 *
 * @param {Array}  allEmployees
 * @param {Array}  allAttendance
 * @param {Array}  allTasks
 * @param {string} month - YYYY-MM
 * @returns {Object} { employees: [...], totals: {...} }
 */
export function calculateMonthlyPayroll(allEmployees, allAttendance, allTasks, month) {
  const activeEmployees = allEmployees.filter(e => e.employment_status === 'active');

  const results = [];
  for (const emp of activeEmployees) {
    const empAttendance = allAttendance.filter(
      a => a.employee_id === emp.employee_id && a.date?.startsWith(month)
    );

    const empTasks = allTasks.filter(t => {
      if (t.assigned_to !== emp.employee_id) return false;
      const created = t.created_at?.substring(0, 7) || '';
      const deadline = t.deadline || '';
      return created === month || deadline.startsWith(month);
    });

    results.push(calculateEmployeePayroll(emp, empAttendance, empTasks, month));
  }

  const totals = {
    total_gross: results.reduce((s, r) => s + r.gross_salary, 0),
    total_deductions: results.reduce((s, r) => s + r.total_deductions, 0),
    total_net: results.reduce((s, r) => s + r.net_salary, 0),
    total_attendance_deductions: results.reduce((s, r) => s + r.attendance_deductions, 0),
    total_task_deductions: results.reduce((s, r) => s + r.task_deductions, 0),
    employee_count: results.length,
    hourly_employees: results.filter(r => r.salary_type === 'hourly').length,
    monthly_employees: results.filter(r => r.salary_type !== 'hourly').length,
  };

  return { employees: results, totals };
}

export { WORK_HOURS_PER_DAY, WORK_DAYS_PER_MONTH, EXPECTED_MONTHLY_HOURS, MIN_SLOTS_FOR_DAY };
