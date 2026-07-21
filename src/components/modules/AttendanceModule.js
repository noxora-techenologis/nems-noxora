'use client';

import { useEffect, useState } from 'react';

const STATUS_LABELS = {
  present: { label: 'حاضر', class: 'badge-success' },
  late: { label: 'متأخر', class: 'badge-warning' },
  absent: { label: 'غائب', class: 'badge-danger' },
  leave: { label: 'إجازة', class: 'badge-info' },
  overtime: { label: 'عمل إضافي', class: 'badge-purple' },
};

export default function AttendanceModule({ session }) {
  const [attendance, setAttendance] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('records'); // records, leaves, request
  const [checkingIn, setCheckingIn] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Leave request form state
  const [leaveType, setLeaveType] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const isEmployee = session.role_name.toLowerCase() === 'employee';
  const canManage = ['admin', 'ceo', 'hr'].includes(session.role_name.toLowerCase());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [attRes, leaveRes, empRes, logRes] = await Promise.all([
        fetch('/api/data/attendance'),
        fetch('/api/data/leaves'),
        fetch('/api/data/employees'),
        fetch('/api/data/attendance_logs'),
      ]);
      const attData = await attRes.json();
      const leaveData = await leaveRes.json();
      const empData = await empRes.json();
      const logData = await logRes.json();

      setAttendance(attData.data || []);
      setLeaves(leaveData.data || []);
      setEmployees(empData.data || []);
      setAttendanceLogs(logData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!session.employee_id) return;
    setCheckingIn(true);
    setScanProgress(10);

    // Simulate biometric scan animation
    const interval = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 20;
      });
    }, 150);

    setTimeout(async () => {
      try {
        const res = await fetch('/api/attendance/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employee_id: session.employee_id, user_id: session.user_id }),
        });
        const result = await res.json();
        if (result.success) {
          alert(result.message);
          fetchData();
        } else {
          alert(result.error || 'فشلت البصمة');
        }
      } catch {
        alert('تعذر الاتصال بالخادم');
      } finally {
        setCheckingIn(false);
        setScanProgress(0);
      }
    }, 900);
  };

  const handleRequestLeave = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      alert('يرجى ملء جميع الحقول');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (totalDays <= 0) {
      alert('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
      return;
    }

    try {
      const res = await fetch('/api/data/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: session.employee_id,
          type: leaveType,
          start_date: startDate,
          end_date: endDate,
          total_days: totalDays,
          reason: reason,
          status: 'pending',
          _userId: session.user_id,
        }),
      });

      const result = await res.json();
      if (result.success) {
        alert('تم تقديم طلب الإجازة بنجاح!');
        setStartDate('');
        setEndDate('');
        setReason('');
        setActiveTab('leaves');
        fetchData();
      } else {
        alert(result.error || 'فشل تقديم الطلب');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleApproveLeave = async (leaveId, status) => {
    try {
      const res = await fetch('/api/data/leaves', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: leaveId,
          _userId: session.user_id,
          status: status,
          approved_by: session.user_id,
          approved_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        }),
      });

      const result = await res.json();
      if (result.success) {
        alert(`تم ${status === 'approved' ? 'قبول' : 'رفض'} الطلب بنجاح`);
        fetchData();
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleClockOut = async () => {
    if (!session.employee_id) return;
    setCheckingIn(true);
    setScanProgress(10);

    const interval = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + 25;
      });
    }, 150);

    setTimeout(async () => {
      try {
        const res = await fetch('/api/attendance/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employee_id: session.employee_id, user_id: session.user_id }),
        });
        const result = await res.json();
        if (result.success) {
          alert(result.message || 'تم تسجيل انصراف اليوم بنجاح!');
          fetchData();
        } else {
          alert(result.error || 'فشل تسجيل الانصراف');
        }
      } catch {
        alert('تعذر الاتصال بالخادم');
      } finally {
        setCheckingIn(false);
        setScanProgress(0);
      }
    }, 900);
  };

  // Filter lists based on role
  const displayAttendance = isEmployee
    ? attendance.filter(a => a.employee_id === session.employee_id)
    : attendance;

  const displayLeaves = isEmployee
    ? leaves.filter(l => l.employee_id === session.employee_id)
    : leaves;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="animate-spin" style={{ fontSize: '32px' }}>⟳</div>
      </div>
    );
  }

  // Find employee's attendance record for today
  const today = new Date().toISOString().split('T')[0];
  const todayRecord = attendance.find(a => a.employee_id === session.employee_id && a.date === today);
  const confirmedSlotsCount = todayRecord ? displayAttendance.filter(a => a.date === today).length : 0; // Wait, actually daily record has a separate logs counter. Let's keep it simple.

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 الحضور والدوام الرسمي</h1>
          <p className="page-subtitle">نظام بصمات الحضور الساعي، الإجازات، وإثبات الوجود الموحد</p>
        </div>
        {isEmployee && (() => {
          // Build today's slots from attendanceLogs
          const today = new Date().toISOString().split('T')[0];
          const todayRecord = attendance.find(a => a.employee_id === session.employee_id && a.date === today);
          const todayLogs = attendanceLogs.filter(l => l.employee_id === session.employee_id && (l.timestamp || '').startsWith(today));
          const SHIFT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15]; // 8 working-hour slots

          return (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '380px' }}>
              
              {/* Row 1: Status and buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>حضور اليوم</div>
                  <div style={{ fontWeight: 800, fontSize: '13px', color: todayRecord ? 'var(--success)' : 'var(--text-secondary)' }}>
                    {todayRecord ? `دخول: ${todayRecord.check_in?.split(' ')[1] || '--:--'}` : 'لم يُسجَّل بعد'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    id="att-checkin-btn"
                    className="btn btn-primary btn-sm"
                    onClick={handleCheckIn}
                    disabled={checkingIn}
                    style={{ position: 'relative', overflow: 'hidden', minWidth: '110px' }}
                  >
                    {checkingIn ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="animate-pulse">🔴</span> جاري البصم...
                      </span>
                    ) : (
                      '👆 بصمة دخول'
                    )}
                    {checkingIn && (
                      <div style={{
                        position: 'absolute', bottom: 0, right: 0, height: '3px',
                        width: `${scanProgress}%`, background: 'rgba(255,255,255,0.5)',
                        transition: 'width 0.15s'
                      }} />
                    )}
                  </button>
                  {todayRecord && !todayRecord.check_out && (
                    <button
                      id="att-checkout-btn"
                      className="btn btn-sm btn-secondary"
                      onClick={handleClockOut}
                      disabled={checkingIn}
                      style={{ color: 'var(--danger)', borderColor: 'rgba(231,76,60,0.4)', minWidth: '100px' }}
                    >
                      🏠 إنهاء الدوام
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: 8-slot hourly progress bar */}
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>مراحل الدوام الساعي (8 ساعات عمل رسمية)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px' }}>
                  {SHIFT_HOURS.map(hr => {
                    const isCompleted = todayLogs.some(l => {
                      const h = new Date(l.timestamp).getHours();
                      return h >= hr && h < hr + 1;
                    });
                    const currentHour = new Date().getHours();
                    const isCurrent = currentHour === hr;
                    return (
                      <div key={hr} style={{ textAlign: 'center' }}>
                        <div style={{
                          height: '28px', borderRadius: '6px',
                          background: isCompleted ? 'var(--success)' : isCurrent ? 'var(--noxora-red-light)' : 'var(--bg-input)',
                          border: isCurrent ? '1px solid var(--noxora-red-light)' : '1px solid var(--border-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: 700,
                          color: isCompleted ? '#fff' : isCurrent ? '#fff' : 'var(--text-muted)',
                          transition: 'all 0.3s',
                          boxShadow: isCompleted ? '0 2px 8px rgba(39,174,96,0.3)' : 'none'
                        }}>
                          {isCompleted ? '✓' : `${hr}`}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px' }}>{hr}:00</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>✅ مكتمل: {todayLogs.length} فترة</span>
                  <span>⏳ متبقي: {Math.max(0, 8 - todayLogs.length)} فترة</span>
                </div>
              </div>

            </div>
          );
        })()}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px' }}>
        <button
          id="tab-records"
          className={`btn ${activeTab === 'records' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('records')}
        >
          📅 سجل البصمات
        </button>
        <button
          id="tab-leaves"
          className={`btn ${activeTab === 'leaves' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('leaves')}
        >
          🏖️ طلبات الإجازات
        </button>
        {isEmployee && (
          <button
            id="tab-request"
            className={`btn ${activeTab === 'request' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('request')}
          >
            ➕ تقديم إجازة
          </button>
        )}
      </div>

      {/* Content */}
      {activeTab === 'records' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">سجل الحضور الساعي والغيابات</h2>
            <div className="badge badge-muted">المجموع: {displayAttendance.length} سجل</div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {!isEmployee && <th>رقم الموظف</th>}
                  <th>التاريخ</th>
                  <th>وقت الدخول</th>
                  <th>وقت الخروج</th>
                  <th>إجمالي الساعات</th>
                  <th>ساعات الإضافي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {displayAttendance.map(row => {
                  const statusInfo = STATUS_LABELS[row.status] || { label: row.status, class: 'badge-muted' };
                  return (
                    <tr key={row.attendance_id} id={`att-${row.attendance_id}`} style={{ transition: 'all var(--transition-fast)' }}>
                      {!isEmployee && <td style={{ fontWeight: 800, color: 'var(--noxora-yellow-light)' }}>{row.employee_id}</td>}
                      <td style={{ fontWeight: 600 }}>{row.date}</td>
                      <td style={{ fontFamily: 'monospace' }}>{row.check_in ? row.check_in.split(' ')[1] : '-'}</td>
                      <td style={{ fontFamily: 'monospace' }}>{row.check_out ? row.check_out.split(' ')[1] : '-'}</td>
                      <td>{row.total_hours ? `${row.total_hours} ساعة` : '-'}</td>
                      <td>{row.overtime_hours ? `${row.overtime_hours} ساعة` : '-'}</td>
                      <td><span className={`badge ${statusInfo.class}`}>{statusInfo.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'leaves' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">تراخيص الإجازات والغيابات المبررة</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {!isEmployee && <th>الموظف</th>}
                  <th>النوع</th>
                  <th>تاريخ البدء</th>
                  <th>تاريخ الانتهاء</th>
                  <th>المدة</th>
                  <th>السبب</th>
                  <th>الحالة</th>
                  {canManage && <th>القرارات الإدارية</th>}
                </tr>
              </thead>
              <tbody>
                {displayLeaves.map(l => (
                  <tr key={l.leave_id} id={`leave-row-${l.leave_id}`}>
                    {!isEmployee && <td style={{ fontWeight: 800, color: 'var(--noxora-yellow-light)' }}>{l.employee_id}</td>}
                    <td style={{ fontWeight: 700 }}>
                      {l.type === 'annual' ? '🌴 سنوية' : l.type === 'sick' ? '🤒 مرضية' : l.type}
                    </td>
                    <td>{l.start_date}</td>
                    <td>{l.end_date}</td>
                    <td style={{ fontWeight: 700 }}>{l.total_days} يوم</td>
                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.reason}>
                      {l.reason}
                    </td>
                    <td>
                      <span className={`badge ${l.status === 'approved' ? 'badge-success' : l.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                        {l.status === 'approved' ? 'معتمدة' : l.status === 'pending' ? 'معلقة' : 'مرفوضة'}
                      </span>
                    </td>
                    {canManage && (
                      <td>
                        {l.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              id={`approve-${l.leave_id}`}
                              className="btn btn-sm btn-secondary"
                              style={{ color: 'var(--success)', borderColor: 'rgba(39, 174, 96, 0.3)' }}
                              onClick={() => handleApproveLeave(l.leave_id, 'approved')}
                            >
                              ✅ موافقة
                            </button>
                            <button
                              id={`reject-${l.leave_id}`}
                              className="btn btn-sm btn-secondary"
                              style={{ color: 'var(--danger)', borderColor: 'rgba(231, 76, 60, 0.3)' }}
                              onClick={() => handleApproveLeave(l.leave_id, 'rejected')}
                            >
                              ❌ رفض
                            </button>
                          </div>
                        ) : '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'request' && isEmployee && (
        <div className="card" style={{ maxWidth: '520px', margin: '0 auto', boxShadow: 'var(--shadow-md)' }}>
          <div className="card-header">
            <h2 className="card-title">🏖️ تقديم طلب رخصة إجازة جديدة</h2>
          </div>
          <form onSubmit={handleRequestLeave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">نوع الإجازة المطلوبة</label>
              <select
                id="leave-type-select"
                className="form-select"
                value={leaveType}
                onChange={e => setLeaveType(e.target.value)}
              >
                <option value="annual">🌴 إجازة سنوية مكفولة</option>
                <option value="sick">🤒 إجازة مرضية مبررة</option>
                <option value="emergency">🚨 إجازة طارئة</option>
                <option value="unpaid">⏳ إجازة بدون راتب</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">تاريخ البداية</label>
                <input
                  id="leave-start-date"
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">تاريخ النهاية</label>
                <input
                  id="leave-end-date"
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">تفاصيل المبرر / السبب</label>
              <textarea
                id="leave-reason"
                className="form-textarea"
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                placeholder="يرجى كتابة شرح كامل لطلب الإجازة للمراجعة الإدارية..."
              />
            </div>
            <button id="submit-leave-btn" type="submit" className="btn btn-primary w-full" style={{ marginTop: '8px' }}>
              إرسال الطلب للاعتماد المباشر
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
