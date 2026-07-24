'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { formatCurrency as fmtCur } from '@/lib/format';

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/data/users').then(r => r.json()),
      fetch('/api/data/roles').then(r => r.json()),
      fetch('/api/data/audit_log').then(r => r.json()),
      fetch('/api/data/system_settings').then(r => r.json()),
      fetch('/api/data/company_valuation').then(r => r.json()),
      fetch('/api/data/owners').then(r => r.json()),
      fetch('/api/data/shares').then(r => r.json()),
    ]).then(([usrs, rls, logs, sets, val, own, shr]) => {
      setData({
        users: usrs.data || [],
        roles: rls.data || [],
        auditLog: (logs.data || []).slice(-10).reverse(),
        settings: sets.data || [],
        valuation: (val.data || [])[0] || null,
        owners: own.data || [],
        shares: shr.data || [],
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div className="animate-spin" style={{ fontSize: '36px' }}>⟳</div>
        <p style={{ color: 'var(--text-secondary)' }}>جاري تحميل بيانات النظام...</p>
      </div>
    </DashboardLayout>
  );

  const { users = [], roles = [], auditLog = [], settings = [], valuation = null, owners = [], shares = [] } = data || {};
  const activeUsers = users.filter(u => u.status === 'active');
  const formatCurrency = (n) => fmtCur(n, 'MRU');

  const ACTION_COLORS = {
    create: 'var(--success)', update: 'var(--info)', delete: 'var(--danger)',
    initialized: 'var(--warning)', login: 'var(--noxora-yellow)'
  };
  const ACTION_ICONS = {
    create: '➕', update: '✏️', delete: '🗑️', initialized: '🚀', login: '🔑'
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">لوحة مدير النظام ⚙️</h1>
          <p className="page-subtitle">صلاحيات كاملة على المستخدمين والنظام والسجلات</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button id="admin-add-user-btn" className="btn btn-primary btn-sm" onClick={() => router.push('/dashboard/admin/users')}>
            ➕ مستخدم جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/admin/users')}>
          <div className="stat-icon blue">👤</div>
          <div className="stat-value">{users.length}</div>
          <div className="stat-label">إجمالي المستخدمين</div>
        </div>
        <div className="stat-card green" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/admin/users')}>
          <div className="stat-icon green">✅</div>
          <div className="stat-value">{activeUsers.length}</div>
          <div className="stat-label">مستخدمون نشطون</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon yellow">🔑</div>
          <div className="stat-value">{roles.length}</div>
          <div className="stat-label">الأدوار المعرفة</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/admin/logs')}>
          <div className="stat-icon purple">📋</div>
          <div className="stat-value">{auditLog.length}</div>
          <div className="stat-label">إجراءات مسجلة</div>
        </div>
      </div>

      {/* Company Valuation */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h2 className="card-title">تقييم أصول الشركة</h2>
          <button className="btn btn-primary btn-sm" onClick={() => router.push('/dashboard/admin/owners')}>
            الملاك والأسهم ←
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', padding: '4px 0' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>إجمالي الأصول</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--noxora-yellow-light)', marginTop: '4px' }}>
              {formatCurrency(valuation ? Number(valuation.total_assets) : 0)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>إجمالي الالتزامات</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--danger)', marginTop: '4px' }}>
              {formatCurrency(valuation ? Number(valuation.total_liabilities) : 0)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>صافي التقييم</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--success)', marginTop: '4px' }}>
              {formatCurrency(valuation ? Number(valuation.total_assets) - Number(valuation.total_liabilities) : 0)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>عدد الأسهم</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--info)', marginTop: '4px' }}>
              {shares.reduce((s, sh) => s + Number(sh.total_shares), 0)} سهم
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>قيمة السهم</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--success)', marginTop: '4px' }}>
              {formatCurrency((valuation ? Number(valuation.total_assets) - Number(valuation.total_liabilities) : 0) / (shares.reduce((s, sh) => s + Number(sh.total_shares), 0) || 1))} / سهم
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>الملاك</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', marginTop: '4px' }}>
              {owners.length} مالك
            </div>
          </div>
        </div>
      </div>

      <div className="grid-cols-2-1">
        {/* Users Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">👤 إدارة المستخدمين</h2>
              <button id="admin-view-all-users" className="btn btn-ghost btn-sm" onClick={() => router.push('/dashboard/admin/users')}>
                الكل →
              </button>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>البريد</th>
                    <th>الدور</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const role = roles.find(r => r.role_id === u.role_id);
                    return (
                      <tr key={u.user_id} id={`user-row-${u.user_id}`}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '50%',
                              background: 'var(--grad-red)', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white', flexShrink: 0
                            }}>
                              {u.name?.[0] || '?'}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '13px' }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</td>
                        <td><span className="badge badge-red" style={{ fontSize: '10px' }}>{role?.role_name || '-'}</span></td>
                        <td><span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                          {u.status === 'active' ? 'نشط' : 'موقوف'}
                        </span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button id={`edit-user-${u.user_id}`} className="btn btn-icon btn-ghost btn-sm" title="تعديل" onClick={() => router.push('/dashboard/admin/users')}>
                              ✏️
                            </button>
                            <button id={`toggle-user-${u.user_id}`} className="btn btn-icon btn-ghost btn-sm" title="تبديل الحالة" onClick={() => router.push('/dashboard/admin/users')}>
                              🔄
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Settings Preview */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">⚙️ إعدادات النظام</h2>
              <button id="admin-settings-btn" className="btn btn-secondary btn-sm" onClick={() => router.push('/dashboard/admin/settings')}>
                تعديل
              </button>
            </div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>المفتاح</th><th>القيمة</th><th>الفئة</th></tr></thead>
                <tbody>
                  {settings.slice(0, 6).map(s => (
                    <tr key={s.setting_id} id={`setting-${s.setting_id}`}>
                      <td style={{ fontSize: '12px' }}>{s.label_ar || s.key}</td>
                      <td style={{ fontWeight: 600, fontSize: '12px' }}>{String(s.value)}</td>
                      <td><span className="badge badge-muted" style={{ fontSize: '10px' }}>{s.category}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Audit Log */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📋 سجل النشاط</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/dashboard/admin/logs')}>
              الكل →
            </button>
          </div>
          <div className="timeline">
            {auditLog.map(log => (
              <div key={log.log_id} className="timeline-item" id={`log-${log.log_id}`}>
                <div className="timeline-dot" style={{ background: ACTION_COLORS[log.action] || 'var(--text-muted)' }} />
                <div className="timeline-time">{log.timestamp}</div>
                <div className="timeline-text">
                  <span style={{ color: ACTION_COLORS[log.action] }}>
                    {ACTION_ICONS[log.action] || '📌'} {log.action}
                  </span>
                  {' '}بواسطة{' '}
                  <strong>{log.user_name}</strong>
                  {' '}في{' '}
                  <strong>{log.module}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
