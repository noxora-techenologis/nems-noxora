'use client';

import { useEffect, useState } from 'react';

export default function LogsModule() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data/audit_log');
      const data = await res.json();
      setLogs((data.data || []).reverse()); // newest first
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter(log =>
    log.user_name.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.module.toLowerCase().includes(search.toLowerCase()) ||
    log.entity_type.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="animate-spin" style={{ fontSize: '32px' }}>⟳</div>
      </div>
    );
  }

  const getActionColor = (action) => {
    if (action === 'create') return 'var(--success)';
    if (action === 'update') return 'var(--info)';
    if (action === 'delete') return 'var(--danger)';
    return 'var(--text-muted)';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 وحدة سجلات النظام والرقابة الذاتية (Audit Log)</h1>
          <p className="page-subtitle">تتبع العمليات الحساسة وجداول البيانات لضمان النزاهة الإدارية والتقنية</p>
        </div>
        <button id="refresh-logs-btn" className="btn btn-secondary btn-sm" onClick={fetchLogs}>
          🔄 تحديث السجلات
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">سجل العمليات الأخير ({filtered.length})</h2>
          <div style={{ width: '250px' }}>
            <input
              type="text"
              placeholder="البحث باسم المستخدم أو الإجراء..."
              className="form-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>التوقيت</th>
                <th>المستخدم</th>
                <th>الإجراء</th>
                <th>القسم</th>
                <th>الجدول</th>
                <th>المعرّف</th>
                <th>تفاصيل تقنية</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log.log_id} id={`log-row-${log.log_id}`}>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{log.timestamp}</td>
                  <td style={{ fontWeight: 700 }}>{log.user_name}</td>
                  <td>
                    <span style={{
                      fontWeight: 700, color: getActionColor(log.action),
                      fontSize: '11px', textTransform: 'uppercase'
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td><span className="badge badge-muted" style={{ fontSize: '10px' }}>{log.module}</span></td>
                  <td><code>{log.entity_type}</code></td>
                  <td><span className="badge badge-red" style={{ fontSize: '10px' }}>{log.entity_id}</span></td>
                  <td style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={JSON.stringify(log.new_value || log.old_value || {})}>
                    {JSON.stringify(log.new_value || log.old_value || {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
