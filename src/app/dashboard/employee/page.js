'use client';

import { useEffect, useState } from 'react';
import { formatCurrency as formatCurrencyImport, formatDateArabic } from '@/lib/format';
import { getSession, getAuthHeaders } from '@/lib/auth';
import DashboardLayout from '@/components/DashboardLayout';

const SLOT_LABELS = ['8ص', '9ص', '10ص', '11ص', '12م', '1م', '2م', '3م'];

export default function EmployeeDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [, setCurrTick] = useState(0);

  // Proof modal states
  const [proofTask, setProofTask] = useState(null);
  const [proofInput, setProofInput] = useState('');
  const [proofFileType, setProofFileType] = useState('link');
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    const handleCurrChange = () => setCurrTick(t => t + 1);
    window.addEventListener('currency-change', handleCurrChange);
    return () => window.removeEventListener('currency-change', handleCurrChange);
  }, []);

  useEffect(() => {
    const sess = getSession();
    setSession(sess);
    if (sess?.employee_id) {
      fetch(`/api/dashboard/employee?employeeId=${sess.employee_id}`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => { setData(d); setLoading(false); })
        .catch(err => { console.error('Employee dashboard fetch error:', err); setLoading(false); });
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
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ employee_id: session.employee_id, user_id: session.user_id }),
      });
      const result = await res.json();
      if (result.success) {
        // Reload data
        const d = await fetch(`/api/dashboard/employee?employeeId=${session.employee_id}`, { headers: getAuthHeaders() }).then(r => r.json());
        setData(d);
      } else {
        alert(result.error || 'فشلت عملية التسجيل');
      }
    } catch (err) {
      console.error(err);
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
                {taskStats.new > 0 && <span className="badge badge-info">🆕 {taskStats.new} جديدة</span>}
                {taskStats.delayed > 0 && <span className="badge badge-danger">⏰ {taskStats.delayed} متأخرة</span>}
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
                  const priorityMap = {
                    critical: { label: '🚨 حرج', class: 'badge-danger' },
                    high: { label: '🔥 عالي', class: 'badge-warning' },
                    medium: { label: '⚡ متوسط', class: 'badge-info' },
                    low: { label: '💤 منخفض', class: 'badge-muted' },
                  };
                  const priorityBadge = priorityMap[task.priority] || { label: task.priority || '', class: 'badge-muted' };
                  const nextStatus = task.status === 'new' ? 'in_progress' : task.status === 'in_progress' ? 'completed' : null;

                  return (
                    <div key={task.task_id} id={`task-${task.task_id}`} style={{
                      padding: '14px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      border: task.is_delayed ? '1px solid rgba(231,76,60,0.4)' : '1px solid var(--border-primary)',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '4px' }}>{task.title}</div>
                        {task.description && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.4 }}>{task.description}</div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className={`badge ${statusBadge.class}`}>{statusBadge.label}</span>
                          {priorityBadge.label && <span className={`badge ${priorityBadge.class}`}>{priorityBadge.label}</span>}
                          {task.deadline && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📅 {task.deadline}</span>}
                          {task.is_delayed && <span className="badge badge-danger" style={{ fontSize: '10px' }}>⏰ متأخر</span>}
                          {task.required_proof && task.required_proof !== 'none' && (
                            <span className="badge badge-warning" style={{ fontSize: '10px' }}>
                              🔒 إثبات: {task.required_proof === 'link' ? 'رابط' : task.required_proof === 'image' ? 'صورة' : task.required_proof === 'video' ? 'فيديو' : 'صوت'}
                            </span>
                          )}
                          {task.deduction_value > 0 && (
                            <span className="badge badge-danger" style={{ fontSize: '10px' }}>💸 خصم: {task.deduction_value} MRU</span>
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
                        {task.attached_media && task.attached_media.url && (
                          <div style={{ marginTop: '8px', padding: '8px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', fontSize: '11px', border: '1px dashed var(--border-accent)' }}>
                            🎬 مرفق: <a href={task.attached_media.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--noxora-yellow-light)', textDecoration: 'underline' }}>فتح الملف المرفق</a>
                          </div>
                        )}
                      </div>
                      {nextStatus && (
                        <button
                          id={`emp-update-task-${task.task_id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ whiteSpace: 'nowrap', alignSelf: 'center' }}
                          onClick={() => {
                            if (nextStatus === 'completed' && task.required_proof && task.required_proof !== 'none') {
                              setProofTask(task);
                              setProofFileType(task.required_proof);
                              setProofInput('');
                              setProofModalOpen(true);
                              return;
                            }
                            const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
                            const updateData = {
                              _id: task.task_id,
                              _userId: session.user_id,
                              status: nextStatus,
                              completion_percentage: nextStatus === 'completed' ? 100 : 50,
                            };
                            if (nextStatus === 'completed') {
                              updateData.completed_at = nowStr;
                              if (task.deadline && new Date(nowStr) > new Date(task.deadline)) {
                                updateData.is_delayed = true;
                              }
                            }
                            fetch('/api/data/tasks', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                              body: JSON.stringify(updateData),
                            }).then(r => r.json()).then(result => {
                              if (result.success) {
                                return fetch(`/api/dashboard/employee?employeeId=${session.employee_id}`, { headers: getAuthHeaders() }).then(r => r.json());
                              } else {
                                alert(result.error || 'فشل تحديث المهمة');
                              }
                            }).then(d => { if (d) setData(d); }).catch(err => {
                              console.error(err);
                              alert('تعذر الاتصال بالخادم');
                            });
                          }}
                        >
                          {nextStatus === 'in_progress' ? '🔄 بدء العمل' : '✅ إنهاء المهمة'}
                        </button>
                      )}
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

      {/* Proof Submission Modal */}
      {proofModalOpen && proofTask && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="card animate-scaleUp" style={{ maxWidth: '500px', width: '100%', boxShadow: 'var(--shadow-lg)', border: '1px solid rgba(243, 156, 18, 0.3)' }}>
            <div className="card-header" style={{ marginBottom: '14px' }}>
              <h2 className="card-title" style={{ fontSize: '18px', color: 'var(--noxora-yellow-light)' }}>📋 متطلبات إثبات إنجاز العمل</h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
              يرجى تقديم الإثبات المطلوب لإنهاء المهمة:
              <br />
              <strong style={{ color: 'var(--text-primary)' }}>{proofTask.title}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {proofFileType === 'link' && (
                <div className="form-group">
                  <label className="form-label">رابط تسليم المهمة (Figma / GitHub / Staging URL)</label>
                  <input
                    id="emp-proof-link-input"
                    type="url"
                    className="form-input"
                    value={proofInput}
                    onChange={e => setProofInput(e.target.value)}
                    placeholder="https://github.com/..."
                  />
                </div>
              )}

              {proofFileType === 'image' && (
                <div className="form-group">
                  <label className="form-label">قم برفع لقطة شاشة كإثبات (صورة)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', textAlign: 'center' }}>
                      📸 اختر صورة الدليل
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            const r = new FileReader();
                            r.onloadend = () => setProofInput(r.result);
                            r.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    {proofInput && (
                      <div style={{ height: '120px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                        <img src={proofInput} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {proofFileType === 'video' && (
                <div className="form-group">
                  <label className="form-label">قم برفع فيديو توضيحي</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', textAlign: 'center' }}>
                      🎥 اختر ملف الفيديو
                      <input
                        type="file"
                        accept="video/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            setProofInput(`data:video/mp4;base64,${file.name}`);
                          }
                        }}
                      />
                    </label>
                    {proofInput && (
                      <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '12px', border: '1px solid var(--success)' }}>
                        ✅ تم اختيار الفيديو بنجاح!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {proofFileType === 'audio' && (
                <div className="form-group">
                  <label className="form-label">التسجيل الصوتي التوضيحي</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-primary)' }}>
                    <div style={{ fontSize: '32px' }}>{recording ? '🎙️🔴' : '🎤'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {recording ? 'جاري تسجيل التوضيح الصوتي...' : 'انقر على الزر لتسجيل شرح صوتي'}
                    </div>
                    <button
                      type="button"
                      className={`btn ${recording ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                      onClick={() => {
                        if (!recording) {
                          setRecording(true);
                          setTimeout(() => {
                            setRecording(false);
                            setProofInput('data:audio/mp3;base64,Recording_Done');
                            alert('تم حفظ التسجيل الصوتي!');
                          }, 3000);
                        }
                      }}
                    >
                      {recording ? '⏹️ إيقاف وحفظ' : '⏺️ بدء التسجيل'}
                    </button>
                    {proofInput && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--success)', fontSize: '13px' }}>
                        <span>🔊 تم حفظ الملف الصوتي المرفق</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <button
                  id="emp-submit-proof-btn"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={!proofInput}
                  onClick={() => {
                    if (!proofInput) return;
                    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
                    const updateData = {
                      _id: proofTask.task_id,
                      _userId: session.user_id,
                      status: 'completed',
                      completion_percentage: 100,
                      completed_at: nowStr,
                      proof_submitted: { type: proofFileType, value: proofInput },
                    };
                    if (proofTask.deadline && new Date(nowStr) > new Date(proofTask.deadline)) {
                      updateData.is_delayed = true;
                    }
                    fetch('/api/data/tasks', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                      body: JSON.stringify(updateData),
                    }).then(r => r.json()).then(result => {
                      if (result.success) {
                        alert('تم تقديم الإثبات واعتماد إنهاء المهمة!');
                        setProofModalOpen(false);
                        setProofTask(null);
                        setProofInput('');
                        return fetch(`/api/dashboard/employee?employeeId=${session.employee_id}`, { headers: getAuthHeaders() }).then(r => r.json());
                      } else {
                        alert(result.error || 'فشلت العملية');
                      }
                    }).then(d => { if (d) setData(d); }).catch(err => {
                      console.error(err);
                      alert('تعذر الاتصال بالخادم');
                    });
                  }}
                >
                  🚀 تقديم الإثبات وإنجاز المهمة
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => { setProofModalOpen(false); setProofTask(null); setProofInput(''); }}>
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
