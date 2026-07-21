'use client';

import { useEffect, useState } from 'react';
import { formatCurrency as formatCurrencyImport, formatDateArabic } from '@/lib/format';
import { getSession } from '@/lib/auth';
import DashboardLayout from '@/components/DashboardLayout';

const SLOT_LABELS = ['8ص', '9ص', '10ص', '11ص', '12م', '1م', '2م', '3م'];

export default function EmployeeDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [, setCurrTick] = useState(0);

  useEffect(() => {
    const handleCurrChange = () => setCurrTick(t => t + 1);
    window.addEventListener('currency-change', handleCurrChange);
    return () => window.removeEventListener('currency-change', handleCurrChange);
  }, []);

  useEffect(() => {
    const sess = getSession();
    setSession(sess);
    if (sess?.employee_id) {
      fetch(`/api/dashboard/employee?employeeId=${sess.employee_id}`)
        .then(r => r.json())
        .then(d => { setData(d); setLoading(false); })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleCheckIn = async () => {
    if (!session?.employee_id) return;
    setCheckingIn(true);
    try {
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: session.employee_id, user_id: session.user_id }),
      });
      const result = await res.json();
      if (result.success) {
        // Reload data
        const d = await fetch(`/api/dashboard/employee?employeeId=${session.employee_id}`).then(r => r.json());
        setData(d);
      } else {
        alert(result.error || 'فشلت عملية التسجيل');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div className="animate-spin" style={{ fontSize: '36px' }}>⟳</div>
        <p style={{ color: 'var(--text-secondary)' }}>جاري تحميل بياناتك...</p>
      </div>
    </DashboardLayout>
  );

  const {
    todayAttendance,
    hourlySlots = [],
    monthAttendance = {},
    taskStats = {},
    myTasks = [],
    latestSalary,
    pendingDeductions = [],
    announcements = []
  } = data || {};

  const confirmedSlots = hourlySlots.filter(s => s.status === 'confirmed').length;
  const isCheckedIn = !!todayAttendance;

  // Format using NEMS unified formatter (enforces Ghubariya numerals and MRU currency)
  const formatCurrency = (n) => formatCurrencyImport(n, 'MRU');

  const getSlotClass = (status) => {
    if (status === 'confirmed') return 'confirmed';
    if (status === 'pending') return 'pending';
    if (status === 'missing') return 'missing';
    return 'empty';
  };

  const TASK_STATUS = {
    completed: { label: 'مكتمل', class: 'badge-success' },
    in_progress: { label: 'جاري', class: 'badge-warning' },
    new: { label: 'جديد', class: 'badge-info' },
    on_hold: { label: 'موقوف', class: 'badge-muted' },
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">مرحباً، {session?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">
            {formatDateArabic(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          id="checkin-btn"
          className={`btn ${isCheckedIn ? 'btn-secondary' : 'btn-primary'} btn-lg`}
          onClick={!isCheckedIn ? handleCheckIn : undefined}
          disabled={checkingIn}
          style={isCheckedIn ? { cursor: 'default' } : {}}
        >
          {checkingIn ? <span className="animate-spin">⟳</span> : (isCheckedIn ? '✅ تم الحضور' : '👆 تسجيل الحضور')}
        </button>
      </div>

      {/* Announcements banner */}
      {announcements.filter(a => a.is_pinned).map(a => (
        <div key={a.announcement_id} style={{
          background: 'rgba(243, 156, 18, 0.1)',
          border: '1px solid rgba(243, 156, 18, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          animation: 'slideDown 0.3s ease'
        }}>
          <span style={{ fontSize: '20px' }}>📢</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--noxora-yellow)' }}>{a.title}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{a.content}</div>
          </div>
        </div>
      ))}

      {/* Stats Row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-value">{confirmedSlots}</div>
          <div className="stat-label">بصمات اليوم من 8</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon yellow">📅</div>
          <div className="stat-value">{monthAttendance.present || 0}</div>
          <div className="stat-label">أيام الحضور هذا الشهر</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">⏱️</div>
          <div className="stat-value">{(monthAttendance.totalHours || 0).toFixed(1)}</div>
          <div className="stat-label">ساعات العمل هذا الشهر</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">📋</div>
          <div className="stat-value">{taskStats.in_progress || 0}</div>
          <div className="stat-label">مهام جارية</div>
        </div>
      </div>

      <div className="grid-cols-2-1">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Hourly Attendance Grid */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">⏰ شبكة الحضور الساعي اليومي</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />مسجّل
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)', display: 'inline-block' }} />معلق
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />فائت
              </div>
            </div>
            <div className="hourly-grid">
              {hourlySlots.map((slot, i) => (
                <div
                  key={slot.slot}
                  id={`hour-slot-${slot.slot}`}
                  className={`hour-slot ${getSlotClass(slot.status)}`}
                  title={slot.timestamp ? `مسجل: ${slot.timestamp}` : 'لم يسجل بعد'}
                >
                  <span className="hour-slot-number">{slot.slot}</span>
                  <span className="hour-slot-label">{SLOT_LABELS[i]}</span>
                  {slot.status === 'confirmed' && <span style={{ fontSize: '12px' }}>✓</span>}
                  {slot.status === 'missing' && <span style={{ fontSize: '12px' }}>✗</span>}
                </div>
              ))}
            </div>
            {isCheckedIn && (
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button
                  id="hourly-checkin-btn"
                  className="btn btn-primary"
                  onClick={handleCheckIn}
                  disabled={checkingIn || confirmedSlots >= 8}
                >
                  {confirmedSlots >= 8 ? '✅ اكتملت البصمات' : `👆 تسجيل بصمة الساعة (${confirmedSlots}/8)`}
                </button>
              </div>
            )}
          </div>

          {/* My Tasks */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">📋 مهامي</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                {taskStats.completed > 0 && <span className="badge badge-success">✅ {taskStats.completed} مكتملة</span>}
                {taskStats.in_progress > 0 && <span className="badge badge-warning">🔄 {taskStats.in_progress} جارية</span>}
              </div>
            </div>
            {myTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                لا توجد مهام مسندة إليك حالياً
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {myTasks.map(task => {
                  const statusBadge = TASK_STATUS[task.status] || { label: task.status, class: 'badge-muted' };
                  return (
                    <div key={task.task_id} id={`task-${task.task_id}`} style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      border: '1px solid var(--border-primary)',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', marginBottom: '6px' }}>{task.title}</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className={`badge ${statusBadge.class}`}>{statusBadge.label}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📅 {task.deadline}</span>
                          {task.completion_percentage > 0 && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {task.completion_percentage}% منجز
                            </span>
                          )}
                        </div>
                        {task.completion_percentage > 0 && (
                          <div className="progress-bar" style={{ marginTop: '8px' }}>
                            <div
                              className={`progress-fill ${task.completion_percentage >= 80 ? 'green' : ''}`}
                              style={{ width: `${task.completion_percentage}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Salary Card */}
          {latestSalary && (
            <div className="card" style={{ border: '1px solid rgba(39, 174, 96, 0.3)', background: 'linear-gradient(135deg, var(--bg-card), rgba(39, 174, 96, 0.05))' }}>
              <div className="card-header">
                <h2 className="card-title">💵 آخر راتب</h2>
                <span className={`badge ${latestSalary.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                  {latestSalary.payment_status === 'paid' ? '✅ مصروف' : '⏳ معلق'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>الشهر</span>
                  <span style={{ fontWeight: 600 }}>{latestSalary.month}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>الأساسي</span>
                  <span>{formatCurrency(latestSalary.base_salary)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>البدلات</span>
                  <span style={{ color: 'var(--success)' }}>+{formatCurrency(latestSalary.allowances)}</span>
                </div>
                {latestSalary.bonuses > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>المكافآت</span>
                    <span style={{ color: 'var(--success)' }}>+{formatCurrency(latestSalary.bonuses)}</span>
                  </div>
                )}
                {latestSalary.deductions > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>الخصومات</span>
                    <span style={{ color: 'var(--danger)' }}>-{formatCurrency(latestSalary.deductions)}</span>
                  </div>
                )}
                <div className="divider" />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>الصافي</span>
                  <span style={{ fontWeight: 800, fontSize: '18px', color: 'var(--success)' }}>
                    {formatCurrency(latestSalary.net_salary)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Pending Deductions Warning */}
          {pendingDeductions.length > 0 && (
            <div className="card" style={{ border: '1px solid rgba(231, 76, 60, 0.3)', background: 'var(--danger-bg)' }}>
              <div className="card-header">
                <h2 className="card-title" style={{ color: 'var(--danger)' }}>⚠️ خصومات معلقة</h2>
                <span className="badge badge-danger">{pendingDeductions.length}</span>
              </div>
              {pendingDeductions.map(d => (
                <div key={d.deduction_id} style={{ fontSize: '13px', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{d.reason}</div>
                  <div style={{ color: 'var(--danger)', fontWeight: 700 }}>-{formatCurrency(d.amount)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Month Summary */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">📅 ملخص الشهر</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { icon: '✅', label: 'أيام حضور', value: monthAttendance.present || 0, color: 'var(--success)' },
                { icon: '⏰', label: 'أيام تأخر', value: monthAttendance.late || 0, color: 'var(--warning)' },
                { icon: '❌', label: 'أيام غياب', value: monthAttendance.absent || 0, color: 'var(--danger)' },
                { icon: '⏱️', label: 'ساعات العمل', value: (monthAttendance.totalHours || 0).toFixed(1), color: 'var(--info)' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontWeight: 700, color: item.color, fontSize: '16px' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
