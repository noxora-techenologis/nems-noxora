'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

export default function HRDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/data/employees').then(r => r.json()),
      fetch('/api/data/leaves').then(r => r.json()),
      fetch('/api/data/attendance').then(r => r.json()),
      fetch('/api/data/departments').then(r => r.json()),
    ]).then(([emps, leaves, att, depts]) => {
      const today = new Date().toISOString().split('T')[0];
      setData({
        employees: emps.data || [],
        leaves: leaves.data || [],
        attendance: att.data || [],
        departments: depts.data || [],
        todayAtt: (att.data || []).filter(a => a.date === today),
      });
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

  const { employees = [], leaves = [], departments = [], todayAtt = [] } = data || {};
  const pendingLeaves = leaves.filter(l => l.status === 'pending');
  const activeEmp = employees.filter(e => e.employment_status === 'active');

  const LEAVE_TYPES = { annual: 'إجازة سنوية', sick: 'إجازة مرضية', unpaid: 'إجازة بدون راتب', emergency: 'إجازة طارئة' };
  const STATUS_BADGE = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">لوحة الموارد البشرية 👥</h1>
          <p className="page-subtitle">إدارة الموظفين والحضور والإجازات</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button id="add-employee-btn" className="btn btn-primary btn-sm" onClick={() => router.push('/dashboard/hr/employees')}>➕ موظف جديد</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-icon green">👥</div>
          <div className="stat-value">{activeEmp.length}</div>
          <div className="stat-label">موظفون نشطون</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">📊</div>
          <div className="stat-value">{todayAtt.filter(a => a.status === 'present').length}</div>
          <div className="stat-label">حضور اليوم</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon yellow">🏖️</div>
          <div className="stat-value">{pendingLeaves.length}</div>
          <div className="stat-label">طلبات إجازة معلقة</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">🏢</div>
          <div className="stat-value">{departments.length}</div>
          <div className="stat-label">الأقسام</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Employees Table */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">👤 قائمة الموظفين</h2>
            <button id="view-all-emp-btn" className="btn btn-ghost btn-sm" onClick={() => router.push('/dashboard/hr/employees')}>الكل →</button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>المسمى الوظيفي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {employees.slice(0, 6).map(emp => (
                  <tr key={emp.employee_id} id={`emp-${emp.employee_id}`}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{emp.employee_id}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {emp.gender === 'male' ? '👨' : '👩'} {emp.nationality}
                      </div>
                    </td>
                    <td style={{ fontSize: '12px' }}>{emp.job_title}</td>
                    <td>
                      <span className={`badge ${emp.employment_status === 'active' ? 'badge-success' : 'badge-muted'}`}>
                        {emp.employment_status === 'active' ? 'نشط' : emp.employment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Leaves */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">🏖️ طلبات الإجازات المعلقة</h2>
            {pendingLeaves.length > 0 && <span className="badge badge-warning">{pendingLeaves.length}</span>}
          </div>
          {pendingLeaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              ✅ لا توجد طلبات معلقة
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingLeaves.map(l => (
                <div key={l.leave_id} style={{
                  padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-primary)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{LEAVE_TYPES[l.type] || l.type}</span>
                    <span className={`badge ${STATUS_BADGE[l.status]}`}>{l.status === 'pending' ? 'معلق' : l.status}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {l.start_date} ← {l.end_date} · {l.total_days} يوم
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>{l.reason}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      id={`approve-leave-${l.leave_id}`}
                      className="btn btn-sm"
                      style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(39,174,96,0.3)', flex: 1 }}
                      onClick={() => router.push('/dashboard/hr/attendance')}
                    >
                      ✅ موافقة
                    </button>
                    <button
                      id={`reject-leave-${l.leave_id}`}
                      className="btn btn-sm"
                      style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(231,76,60,0.3)', flex: 1 }}
                      onClick={() => router.push('/dashboard/hr/attendance')}
                    >
                      ❌ رفض
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
