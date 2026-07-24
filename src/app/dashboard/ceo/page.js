'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency as formatCurrencyImport } from '@/lib/format';
import DashboardLayout from '@/components/DashboardLayout';

const STATUS_LABELS = {
  active: { label: 'نشط', class: 'badge-success' },
  planning: { label: 'تخطيط', class: 'badge-info' },
  completed: { label: 'مكتمل', class: 'badge-muted' },
  on_hold: { label: 'موقوف', class: 'badge-warning' },
};

const PRIORITY_LABELS = {
  critical: { label: 'حرج', class: 'badge-danger' },
  high: { label: 'عالي', class: 'badge-warning' },
  medium: { label: 'متوسط', class: 'badge-info' },
  low: { label: 'منخفض', class: 'badge-muted' },
};

export default function CEODashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [, setCurrTick] = useState(0);

  useEffect(() => {
    const handleCurrChange = () => setCurrTick(t => t + 1);
    window.addEventListener('currency-change', handleCurrChange);
    return () => window.removeEventListener('currency-change', handleCurrChange);
  }, []);

  useEffect(() => {
    fetch('/api/dashboard/ceo')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div className="animate-spin" style={{ fontSize: '36px' }}>⟳</div>
        <p style={{ color: 'var(--text-secondary)' }}>جاري تحميل بيانات لوحة التحكم...</p>
      </div>
    </DashboardLayout>
  );

  const { stats = {}, projects = [], taskStats = {}, recentAnnouncements = [] } = data || {};

  // Format using NEMS unified formatter (enforces Ghubariya numerals and MRU currency)
  const formatCurrency = (n) => formatCurrencyImport(n, 'MRU');

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">لوحة تحكم المدير العام 🏢</h1>
          <p className="page-subtitle">نظرة شاملة على أداء الشركة - Noxora Technologies</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button id="ceo-refresh-btn" className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>
            🔄 تحديث
          </button>
          <button id="ceo-report-btn" className="btn btn-primary btn-sm" onClick={() => router.push('/dashboard/ceo/reports')}>
            📊 تقرير شامل
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div className="stat-icon red">👥</div>
            <span className="stat-change up">+2 هذا الشهر</span>
          </div>
          <div className="stat-value">{stats.totalEmployees || 0}</div>
          <div className="stat-label">إجمالي الموظفين</div>
        </div>

        <div className="stat-card yellow">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div className="stat-icon yellow">📂</div>
            <span className="stat-change up">نشط</span>
          </div>
          <div className="stat-value">{stats.activeProjects || 0}</div>
          <div className="stat-label">المشاريع النشطة</div>
        </div>

        <div className="stat-card green">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div className="stat-icon green">💰</div>
            <span className="stat-change up">هذا العام</span>
          </div>
          <div className="stat-value" style={{ fontSize: '20px' }}>{formatCurrency(stats.totalRevenue)}</div>
          <div className="stat-label">إجمالي الإيرادات</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div className="stat-icon blue">📊</div>
            <span className="stat-change up">{stats.attendanceRate || 0}%</span>
          </div>
          <div className="stat-value">{stats.todayAttendance || 0}</div>
          <div className="stat-label">حضور اليوم</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div className="stat-icon purple">📋</div>
            {stats.pendingLeaves > 0 && <span className="stat-change down">تحتاج مراجعة</span>}
          </div>
          <div className="stat-value">{stats.pendingLeaves || 0}</div>
          <div className="stat-label">طلبات الإجازات المعلقة</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div className="stat-icon green">📈</div>
          </div>
          <div className="stat-value" style={{ fontSize: '20px', color: 'var(--success)' }}>
            {formatCurrency(stats.netProfit)}
          </div>
          <div className="stat-label">صافي الربح</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid-cols-2-1">
        {/* Projects Table */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📂 المشاريع الجارية</h2>
            <button id="view-all-projects-btn" className="btn btn-ghost btn-sm" onClick={() => router.push('/dashboard/ceo/projects')}>عرض الكل →</button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>المشروع</th>
                  <th>الأولوية</th>
                  <th>التقدم</th>
                  <th>الحالة</th>
                  <th>الصحة</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => {
                  const statusBadge = STATUS_LABELS[p.status] || { label: p.status, class: 'badge-muted' };
                  const priorityBadge = PRIORITY_LABELS[p.priority] || { label: p.priority, class: 'badge-muted' };
                  return (
                    <tr key={p.project_id} id={`project-row-${p.project_id}`}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.project_id}</div>
                      </td>
                      <td><span className={`badge ${priorityBadge.class}`}>{priorityBadge.label}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="progress-bar" style={{ width: '80px' }}>
                            <div
                              className={`progress-fill ${p.progress >= 80 ? 'green' : p.progress >= 50 ? 'yellow' : ''}`}
                              style={{ width: `${p.progress}%` }}
                            />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>{p.progress}%</span>
                        </div>
                      </td>
                      <td><span className={`badge ${statusBadge.class}`}>{statusBadge.label}</span></td>
                      <td>
                        <span style={{
                          fontWeight: 700, fontSize: '13px',
                          color: p.health_score >= 80 ? 'var(--success)' : p.health_score >= 60 ? 'var(--warning)' : 'var(--danger)'
                        }}>
                          {p.health_score}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Task Summary */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">📋 المهام</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'مكتملة', value: taskStats.completed, color: 'var(--success)', icon: '✅' },
                { label: 'جارية', value: taskStats.in_progress, color: 'var(--warning)', icon: '🔄' },
                { label: 'جديدة', value: taskStats.new, color: 'var(--info)', icon: '🆕' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontWeight: 700, color: item.color, fontSize: '18px' }}>{item.value}</span>
                </div>
              ))}
              <div className="divider" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>الإجمالي</span>
                <span style={{ fontWeight: 800, fontSize: '20px' }}>{taskStats.total}</span>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">💰 ملخص مالي</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '13px', color: 'var(--success)' }}>📈 الإيرادات</span>
                <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '13px' }}>{formatCurrency(stats.totalRevenue)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '13px', color: 'var(--danger)' }}>📉 المصروفات</span>
                <span style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '13px' }}>{formatCurrency(stats.totalExpenses)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 8px', borderTop: '2px solid var(--border-primary)', marginTop: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>🏆 صافي الربح</span>
                <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: '16px' }}>{formatCurrency(stats.netProfit)}</span>
              </div>
            </div>
          </div>

          {/* Announcements */}
          {recentAnnouncements.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">📢 الإعلانات</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentAnnouncements.map(a => (
                  <div key={a.announcement_id} style={{
                    padding: '10px',
                    background: a.priority === 'important' ? 'rgba(243, 156, 18, 0.08)' : 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    borderRight: `3px solid ${a.priority === 'important' ? 'var(--noxora-yellow)' : 'var(--border-primary)'}`,
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{a.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.date?.split(' ')[0]}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
