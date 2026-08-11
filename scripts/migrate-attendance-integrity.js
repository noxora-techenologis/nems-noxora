/**
 * Migration: attendance data integrity
 * =====================================
 * 1. Dedupe `attendance` — keep the most complete row per (employee_id, date).
 *    Existing rows were created with no UNIQUE guard, producing duplicates.
 *    "Most complete" = highest confirmed_slots, tie-broken by latest created_at,
 *    tie-broken by highest attendance_id. Logs of removed rows are re-pointed
 *    at the survivor so no attendance_logs row is orphaned.
 * 2. Add UNIQUE(employee_id, date) on `attendance`.
 * 3. Add UNIQUE(attendance_id, hour_slot) on `attendance_logs`.
 *
 * Idempotent: re-running is safe.
 */
const { Pool } = require('pg');

const connStr = 'postgresql://neondb_owner:npg_Mx2LkwqnmG3p@ep-wild-heart-ayb4bk6o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Dedupe attendance ──
    const groups = await client.query(`
      SELECT employee_id, date, COUNT(*) AS cnt
      FROM attendance
      WHERE employee_id IS NOT NULL
      GROUP BY employee_id, date
      HAVING COUNT(*) > 1
    `);
    console.log(`Duplicate attendance groups: ${groups.rows.length}`);

    let removed = 0;
    let repointed = 0;
    for (const g of groups.rows) {
      // survivor: most confirmed_slots, then latest created_at, then highest id
      const survivors = await client.query(`
        SELECT attendance_id
        FROM attendance
        WHERE employee_id = $1 AND date = $2
        ORDER BY confirmed_slots DESC, created_at DESC NULLS LAST, attendance_id DESC
        LIMIT 1
      `, [g.employee_id, g.date]);
      if (survivors.rows.length === 0) continue;
      const keepId = survivors.rows[0].attendance_id;

      const victims = await client.query(`
        SELECT attendance_id FROM attendance
        WHERE employee_id = $1 AND date = $2 AND attendance_id <> $3
      `, [g.employee_id, g.date, keepId]);

      for (const v of victims.rows) {
        const moved = await client.query(
          `UPDATE attendance_logs SET attendance_id = $1 WHERE attendance_id = $2 RETURNING log_id`,
          [keepId, v.attendance_id]
        );
        repointed += moved.rowCount;
        await client.query(`DELETE FROM attendance WHERE attendance_id = $1`, [v.attendance_id]);
        removed++;
      }
    }
    console.log(`Removed ${removed} duplicate attendance rows, repointed ${repointed} logs`);

    // ── 2. Dedupe attendance_logs: keep latest timestamp per (attendance_id, hour_slot) ──
    // (Must run AFTER repointing so repointed logs collapse into the survivor's slot.)
    const logGroups = await client.query(`
      SELECT attendance_id, hour_slot, COUNT(*) AS cnt
      FROM attendance_logs
      WHERE attendance_id IS NOT NULL AND hour_slot IS NOT NULL
      GROUP BY attendance_id, hour_slot
      HAVING COUNT(*) > 1
    `);
    let removedLogs = 0;
    for (const g of logGroups.rows) {
      await client.query(`
        DELETE FROM attendance_logs
        WHERE attendance_id = $1 AND hour_slot = $2
          AND log_id <> (
            SELECT log_id FROM attendance_logs
            WHERE attendance_id = $1 AND hour_slot = $2
            ORDER BY timestamp DESC NULLS LAST, log_id DESC
            LIMIT 1
          )
      `, [g.attendance_id, g.hour_slot]);
      removedLogs++;
    }
    console.log(`Deduplicated attendance_logs: ${removedLogs} slot groups collapsed`);

    // ── 3. UNIQUE(employee_id, date) on attendance ──
    await client.query(`
      ALTER TABLE attendance
      DROP CONSTRAINT IF EXISTS uq_attendance_employee_date
    `);
    await client.query(`
      ALTER TABLE attendance
      ADD CONSTRAINT uq_attendance_employee_date UNIQUE (employee_id, date)
    `);
    console.log('UNIQUE(employee_id, date) on attendance: OK');

    // ── 4. UNIQUE(attendance_id, hour_slot) on attendance_logs ──
    await client.query(`
      ALTER TABLE attendance_logs
      DROP CONSTRAINT IF EXISTS uq_attendance_logs_att_slot
    `);
    await client.query(`
      ALTER TABLE attendance_logs
      ADD CONSTRAINT uq_attendance_logs_att_slot UNIQUE (attendance_id, hour_slot)
    `);
    console.log('UNIQUE(attendance_id, hour_slot) on attendance_logs: OK');

    await client.query('COMMIT');
    console.log('\nMigration committed.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
