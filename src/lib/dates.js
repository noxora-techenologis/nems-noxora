/**
 * NEMS Date Helpers
 * =================
 * Postgres DATE/TIMESTAMP columns come back from `pg` as JS Date objects
 * (e.g. 2026-08-11T00:00:00.000Z), while client-side JSON serializes them
 * into strings like "2026-08-11T00:00:00.000Z". Raw comparisons like
 * `a.date === today` (a string "2026-08-11") therefore always fail.
 * These helpers normalize any of those forms into a plain "YYYY-MM-DD" key.
 */

export function dateKey(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value).slice(0, 10);
}

export function sameDay(value, ymd) {
  return dateKey(value) === ymd;
}

export function sameMonth(value, ym) {
  return dateKey(value).startsWith(ym);
}
