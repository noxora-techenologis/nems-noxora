import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySession, requireRole } from '@/lib/serverAuth';

/**
 * GET /api/admin/storage
 * Returns database storage statistics for the admin.
 */
export async function GET(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const roleErr = await requireRole(user, ['admin']);
    if (roleErr) return roleErr;

    // Total database size
    const dbSizeResult = await query(`SELECT pg_database_size(current_database()) AS size_bytes`);
    const dbSizeBytes = Number(dbSizeResult.rows[0].size_bytes) || 0;

    // Table sizes and row counts
    const tablesResult = await query(`
      SELECT
        t.tablename AS table_name,
        pg_total_relation_size(quote_ident(t.tablename)) AS total_bytes,
        pg_relation_size(quote_ident(t.tablename)) AS table_bytes,
        pg_indexes_size(quote_ident(t.tablename)) AS index_bytes,
        (SELECT reltuples::bigint FROM pg_class WHERE relname = t.tablename) AS row_count
      FROM pg_tables t
      WHERE t.schemaname = 'public'
      ORDER BY total_bytes DESC
    `);

    const tables = tablesResult.rows.map(r => ({
      table_name: r.table_name,
      total_bytes: Number(r.total_bytes) || 0,
      table_bytes: Number(r.table_bytes) || 0,
      index_bytes: Number(r.index_bytes) || 0,
      row_count: Number(r.row_count) || 0,
    }));

    // Total rows across all tables
    const totalRows = tables.reduce((s, t) => s + t.row_count, 0);

    // Index count
    const indexResult = await query(`
      SELECT COUNT(*) AS index_count
      FROM pg_indexes
      WHERE schemaname = 'public'
    `);
    const indexCount = Number(indexResult.rows[0].index_count) || 0;

    // Active connections
    const connResult = await query(`
      SELECT COUNT(*) AS active_connections
      FROM pg_stat_activity
      WHERE datname = current_database() AND state = 'active'
    `);
    const activeConnections = Number(connResult.rows[0].active_connections) || 0;

    return NextResponse.json({
      database: {
        name: 'neondb',
        total_size_bytes: dbSizeBytes,
        total_size_mb: Math.round(dbSizeBytes / (1024 * 1024) * 100) / 100,
        total_tables: tables.length,
        total_rows: totalRows,
        total_indexes: indexCount,
        active_connections: activeConnections,
      },
      tables,
    });
  } catch (err) {
    console.error('Storage GET Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
