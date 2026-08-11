'use client';

import { useEffect, useState } from 'react';
import { getAuthHeaders } from '@/lib/auth';
import { formatNumber } from '@/lib/format';

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const DB_SIZE_LIMIT_MB = 512;

export default function StorageModule() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('total_bytes');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/storage', { headers: getAuthHeaders() });
      const result = await res.json();
      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
      }
    } catch (err) {
      console.error(err);
      setError('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="animate-spin" style={{ fontSize: '32px' }}>⟳</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ color: 'var(--danger)', marginBottom: '8px' }}>خطأ في تحميل البيانات</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{error}</p>
        <button className="btn btn-primary" onClick={fetchData}>🔄 إعادة المحاولة</button>
      </div>
    );
  }

  if (!data) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد بيانات</div>;
  }

  const { database, tables } = data;
  const maxBytes = Math.max(...tables.map(t => t.total_bytes), 1);

  const sortedTables = [...tables].sort((a, b) => {
    if (sortBy === 'total_bytes') return b.total_bytes - a.total_bytes;
    if (sortBy === 'row_count') return b.row_count - a.row_count;
    if (sortBy === 'index_bytes') return b.index_bytes - a.index_bytes;
    return a.table_name.localeCompare(b.table_name);
  });

  const dbUsagePercent = database.total_size_mb > 0 ? Math.min(100, (database.total_size_mb / DB_SIZE_LIMIT_MB) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🗄️ مساحة التخزين — قاعدة البيانات</h1>
          <p className="page-subtitle">إحصائيات حجم قاعدة البيانات والجداول والفهارس</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchData}>🔄 تحديث</button>
      </div>

      {/* Database Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>حجم قاعدة البيانات</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--info)', marginTop: '4px' }}>
            {database.total_size_mb} MB
          </div>
          <div style={{ marginTop: '8px', height: '6px', borderRadius: '3px', background: 'var(--border-primary)' }}>
            <div style={{ height: '100%', width: `${dbUsagePercent}%`, borderRadius: '3px', background: dbUsagePercent > 80 ? 'var(--danger)' : 'var(--info)' }} />
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {dbUsagePercent.toFixed(1)}% من {DB_SIZE_LIMIT_MB} MB
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>عدد الجداول</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--success)', marginTop: '4px' }}>
            {formatNumber(database.total_tables)}
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>إجمالي الصفوف (تقريبي)</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--noxora-yellow-light)', marginTop: '4px' }}>
            {formatNumber(database.total_rows)}
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>عدد الفهارس</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--warning)', marginTop: '4px' }}>
            {formatNumber(database.total_indexes)}
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>الاتصالات النشطة</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--danger)', marginTop: '4px' }}>
            {database.active_connections}
          </div>
        </div>
      </div>

      {/* Tables List */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">تفاصيل الجداول ({tables.length})</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn btn-sm ${sortBy === 'total_bytes' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSortBy('total_bytes')}
            >
              الحجم
            </button>
            <button
              className={`btn btn-sm ${sortBy === 'row_count' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSortBy('row_count')}
            >
              الصفوف
            </button>
            <button
              className={`btn btn-sm ${sortBy === 'index_bytes' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSortBy('index_bytes')}
            >
              الفهارس
            </button>
            <button
              className={`btn btn-sm ${sortBy === 'table_name' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSortBy('table_name')}
            >
              الاسم
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-primary)', textAlign: 'right' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)' }}>#</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)' }}>اسم الجدول</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)' }}>الحجم الكلي</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)' }}>البيانات</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)' }}>الفهارس</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)' }}>الصفوف</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)', minWidth: '200px' }}>الحجم النسبي</th>
              </tr>
            </thead>
            <tbody>
              {sortedTables.map((t, i) => {
                const barWidth = maxBytes > 0 ? (t.total_bytes / maxBytes) * 100 : 0;
                return (
                  <tr key={t.table_name} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 700, fontFamily: 'monospace', fontSize: '12px' }}>{t.table_name}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 800, color: 'var(--info)' }}>{formatBytes(t.total_bytes)}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{formatBytes(t.table_bytes)}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{formatBytes(t.index_bytes)}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 700 }}>{formatNumber(t.row_count)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'var(--border-primary)' }}>
                          <div style={{
                            height: '100%', borderRadius: '3px', width: `${barWidth}%`,
                            background: barWidth > 70 ? 'var(--danger)' : barWidth > 40 ? 'var(--warning)' : 'var(--success)'
                          }} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '40px' }}>
                          {((t.total_bytes / (database.total_size_bytes || 1)) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
