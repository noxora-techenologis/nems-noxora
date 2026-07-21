'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function PMDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/data/projects').then(r => r.json()),
      fetch('/api/data/tasks').then(r => r.json()),
      fetch('/api/data/meetings').then(r => r.json()),
    ]).then(([prjs, tsks, mts]) => {
      setData({ projects: prjs.data || [], tasks: tsks.data || [], meetings: mts.data || [] });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div className="animate-spin" style={{ fontSize: '36px' }}>⟳</div>
        <p style={{ color: 'var(--text-secondary)' }}>جاري تحميل البيانات...</p>
      </div>
    </DashboardLayout>
  );

  const { projects = [], tasks = [], meetings = [] } = data || {};
  const activeProjects = projects.filter(p => p.status === 'active');
  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled').slice(0, 3);

  const TASK_STATUS_COLORS = {
    completed: 'badge-success', in_progress: 'badge-warning', new: 'badge-info', on_hold: 'badge-muted'
  };
  const TASK_STATUS_LABELS = {
    completed: 'مكتمل', in_progress: 'جاري', new: 'جديد', on_hold: 'موقوف'
  };
  const PRIORITY_COLORS = { critical: 'badge-danger', high: 'badge-warning', medium: 'badge-info', low: 'badge-muted' };
  const PRIORITY_LABELS = { critical: 'حرج', high: 'عالي', medium: 'متوسط', low: 'منخفض' };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">لوحة مدير المشاريع 📂</h1>
          <p className="page-subtitle">إدارة المشاريع والمهام والاجتماعات</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button id="pm-add-task-btn" className="btn btn-secondary btn-sm">➕ مهمة</button>
          <button id="pm-add-project-btn" className="btn btn-primary btn-sm">➕ مشروع جديد</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">📂</div>
          <div className="stat-value">{projects.length}</div>
          <div className="stat-label">إجمالي المشاريع</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green">🟢</div>
          <div className="stat-value">{activeProjects.length}</div>
          <div className="stat-label">مشاريع نشطة</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon yellow">📋</div>
          <div className="stat-value">{tasks.filter(t => t.status === 'in_progress').length}</div>
          <div className="stat-label">مهام جارية</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">✅</div>
          <div className="stat-value">{tasks.filter(t => t.status === 'completed').length}</div>
          <div className="stat-label">مهام مكتملة</div>
        </div>
      </div>

      <div className="grid-cols-2-1">
        {/* Projects with Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeProjects.map(p => {
            const projectTasks = tasks.filter(t => t.project_id === p.project_id);
            return (
              <div key={p.project_id} className="card" id={`project-card-${p.project_id}`}>
                <div className="card-header">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {p.project_id} · انتهاء: {p.end_date}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '22px', fontWeight: 800,
                      color: p.progress >= 80 ? 'var(--success)' : p.progress >= 50 ? 'var(--warning)' : 'var(--danger)'
                    }}>{p.progress}%</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>التقدم</div>
                  </div>
                </div>
                <div className="progress-bar" style={{ marginBottom: '14px' }}>
                  <div
                    className={`progress-fill ${p.progress >= 80 ? 'green' : p.progress >= 50 ? 'yellow' : ''}`}
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
                {projectTasks.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {projectTasks.slice(0, 3).map(t => (
                      <div key={t.task_id} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)'
                      }}>
                        <span className={`badge ${TASK_STATUS_COLORS[t.status] || 'badge-muted'}`} style={{ fontSize: '10px' }}>
                          {TASK_STATUS_LABELS[t.status] || t.status}
                        </span>
                        <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)' }}>{t.title}</span>
                        <span className={`badge ${PRIORITY_COLORS[t.priority] || 'badge-muted'}`} style={{ fontSize: '10px' }}>
                          {PRIORITY_LABELS[t.priority] || t.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Meetings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">📅 الاجتماعات القادمة</h2>
              <button id="pm-add-meeting-btn" className="btn btn-ghost btn-sm">➕</button>
            </div>
            {upcomingMeetings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                لا توجد اجتماعات قادمة
              </div>
            ) : (
              upcomingMeetings.map(m => (
                <div key={m.meeting_id} id={`meeting-${m.meeting_id}`} style={{
                  padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-primary)', marginBottom: '8px'
                }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>{m.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    📅 {m.date} · ⏰ {m.start_time} - {m.end_time}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>📍 {m.location}</div>
                </div>
              ))
            )}
          </div>

          {/* Task distribution */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">📊 توزيع المهام</h2>
            </div>
            {[
              { label: 'مكتملة', count: tasks.filter(t => t.status === 'completed').length, color: 'var(--success)' },
              { label: 'جارية', count: tasks.filter(t => t.status === 'in_progress').length, color: 'var(--warning)' },
              { label: 'جديدة', count: tasks.filter(t => t.status === 'new').length, color: 'var(--info)' },
            ].map(item => (
              <div key={item.label} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: item.color }}>{item.count}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: tasks.length > 0 ? `${(item.count / tasks.length) * 100}%` : '0%',
                    background: item.color
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
