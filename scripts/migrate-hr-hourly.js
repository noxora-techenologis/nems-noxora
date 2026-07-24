import { query } from '../src/lib/db.js';

const migrations = [
  // === EMPLOYEES: salary_type & hourly_rate ===
  `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "salary_type" VARCHAR(20) DEFAULT 'monthly'`,
  `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "hourly_rate" DECIMAL(10,2) DEFAULT 0`,

  // === TASKS: deduction_value, completed_at, is_delayed ===
  `ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "deduction_value" DECIMAL(15,2) DEFAULT 0`,
  `ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP`,
  `ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "is_delayed" BOOLEAN DEFAULT FALSE`,

  // === SALARIES: hourly payroll tracking ===
  `ALTER TABLE "salaries" ADD COLUMN IF NOT EXISTS "hours_worked" DECIMAL(8,2) DEFAULT 0`,
  `ALTER TABLE "salaries" ADD COLUMN IF NOT EXISTS "absent_hours" DECIMAL(8,2) DEFAULT 0`,
  `ALTER TABLE "salaries" ADD COLUMN IF NOT EXISTS "hourly_rate" DECIMAL(10,2) DEFAULT 0`,
  `ALTER TABLE "salaries" ADD COLUMN IF NOT EXISTS "task_deductions" DECIMAL(15,2) DEFAULT 0`,
  `ALTER TABLE "salaries" ADD COLUMN IF NOT EXISTS "attendance_deductions" DECIMAL(15,2) DEFAULT 0`,
  `ALTER TABLE "salaries" ADD COLUMN IF NOT EXISTS "gross_salary" DECIMAL(15,2) DEFAULT 0`,

  // === ATTENDANCE: track absent_hours per day ===
  `ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "absent_hours" DECIMAL(5,2) DEFAULT 0`,
  `ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "confirmed_slots" INT DEFAULT 0`,
];

async function runMigrations() {
  let success = 0;
  let failed = 0;
  for (const sql of migrations) {
    try {
      await query(sql);
      const col = sql.match(/ADD COLUMN IF NOT EXISTS "(\w+)"/)?.[1] || '?';
      const tbl = sql.match(/TABLE "(\w+)"/)?.[1] || '?';
      console.log(`  ✓ ${tbl}.${col}`);
      success++;
    } catch (err) {
      console.error(`  ✗ FAILED: ${err.message}`);
      failed++;
    }
  }
  console.log(`\nMigration complete: ${success} succeeded, ${failed} failed`);
  process.exit(0);
}

runMigrations();
