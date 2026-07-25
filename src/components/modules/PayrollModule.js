'use client';

import { useEffect, useState } from 'react';
import { formatCurrency as formatCurrencyImport } from '@/lib/format';
import { getAuthHeaders } from '@/lib/auth';

export default function PayrollModule({ session }) {
  const [payrollData, setPayrollData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [, setCurrTick] = useState(0);

  useEffect(() => {
    const handleCurrChange = () => setCurrTick(t => t + 1);
    window.addEventListener('currency-change', handleCurrChange);
    return () => window.removeEventListener('currency-change', handleCurrChange);
  }, []);

  const role = session.role_name?.toLowerCase() || '';
  const canManage = ['fm', 'admin'].includes(role);
  const canView = ['fm', 'admin', 'ceo', 'owner'].includes(role);

  const formatCurrency = (n) => formatCurrencyImport(n, 'MRU');

  useEffect(() => {
    if (canView) fetchPayroll();
  }, [selectedMonth, canView]);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/auto?month=${selectedMonth}`, { headers: getAuthHeaders() });
      const data = await res.json();
      setPayrollData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!confirm(`هل تريد إنشاء/تحديث كشوف رواتب شهر ${selectedMonth}؟\nسيتم احتساب الحضور والغياب والمهام تلقائياً.`)) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/payroll/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ month: selectedMonth, action: 'generate', _userId: session.user_id }),
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        fetchPayroll();
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!payrollData?.employees) return;
    const pendingCount = payrollData.employees.filter(e => e.salary_status !== 'paid').length;
    if (pendingCount === 0) {
      alert('جميع الرواتب مدفوعة بالفعل.');
      return;
    }

    const totalNet = payrollData.totals?.total_net || 0;
    if (!confirm(
      `⚠️ تأكيد صرف الرواتب — شهر ${selectedMonth}\n\n` +
      `عدد الموظفين: ${pendingCount}\n` +
      `إجمالي صافي الرواتب: ${totalNet} MRU\n\n` +
      `سيتم:\n` +
      `1. تسجيل جميع الرواتب كمدفوعة\n` +
      `2. إنشاء سجل مصروف بالقيمة الإجمالية\n` +
      `3. خصم المبلغ من تقييم الشركة\n\n` +
      `هل أنت متأكد؟`
    )) return;

    setConfirming(true);
    try {
      const res = await fetch('/api/payroll/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ month: selectedMonth, action: 'confirm_payment', _userId: session.user_id }),
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        fetchPayroll();
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    } finally {
      setConfirming(false);
    }
  };

  if (!canView) {
    return (
      <div className="card text-center" style={{ padding: '40px', margin: '40px auto', maxWidth: '500px' }}>
        <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🚫</span>
        <h2 style={{ color: 'var(--danger)', marginBottom: '8px' }}>غير مصرح بالوصول</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          وحدة الرواتب متاحة للمدير المالي (FM) والمحاسب فقط.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="animate-spin" style={{ fontSize: '32px' }}>⟳</div>
      </div>
    );
  }

  const t = payrollData?.totals || {};
  const emps = payrollData?.employees || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💰 وحدة الرواتب الآلية</h1>
          <p className="page-subtitle">
            {canManage
              ? 'احسب، راجع، وصرف الرواتب تلقائياً كل شهر'
              : 'متابعة الرواتب والمصروفات الشهرية (عرض فقط)'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="month"
            className="form-input"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ width: '180px' }}
          />
          {canManage && (
            <>
              <button
                id="generate-payroll-btn"
                className="btn btn-primary btn-sm"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? '⏳ جاري...' : '🧮 حساب الرواتب'}
              </button>
              <button
                id="confirm-payment-btn"
                className="btn btn-sm"
                onClick={handleConfirmPayment}
                disabled={confirming}
                style={{ background: 'var(--success)', color: '#fff', borderColor: 'var(--success)' }}
              >
                {confirming ? '⏳ جاري الصرف...' : '✅ تأكيد صرف الرواتب'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: '16px' }}>{t.employee_count || 0}</div>
          <div className="stat-label">الموظفون النشطون</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value" style={{ fontSize: '16px' }}>{formatCurrency(t.total_gross || 0)}</div>
          <div className="stat-label">الرواتب الإجمالية</div>
        </div>
        <div className="stat-card red">
          <div className="stat-value" style={{ fontSize: '16px' }}>-{formatCurrency(t.total_deductions || 0)}</div>
          <div className="stat-label">الخصومات</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value" style={{ fontSize: '16px', color: 'var(--success)' }}>{formatCurrency(t.total_net || 0)}</div>
          <div className="stat-label">صافي الرواتب</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: '16px' }}>
            {formatCurrency((t.total_attendance_deductions || 0))} | {formatCurrency((t.total_task_deductions || 0))}
          </div>
          <div className="stat-label">خصم حضور | خصم مهام</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px' }}>
        <button
          id="tab-overview"
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 نظرة عامة
        </button>
        <button
          id="tab-details"
          className={`btn ${activeTab === 'details' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('details')}
        >
          📋 التفاصيل
        </button>
        {canManage && (
          <button
            id="tab-formula"
            className={`btn ${activeTab === 'formula' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('formula')}
          >
            🧮 المعادلة
          </button>
        )}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">ملخص الرواتب — {selectedMonth}</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>الوظيفة</th>
                  <th>النوع</th>
                  <th>ساعات العمل</th>
                  <th>الغياب</th>
                  <th>الراتب الخام</th>
                  <th>خصم الحضور</th>
                  <th>خصم المهام</th>
                  <th>الخصومات</th>
                  <th>الصافي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {emps.map(emp => (
                  <tr key={emp.employee_id} id={`payroll-row-${emp.employee_id}`}>
                    <td style={{ fontWeight: 700 }}>{emp.employee_name}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{emp.job_title}</td>
                    <td>
                      <span className={`badge ${emp.salary_type === 'hourly' ? 'badge-warning' : 'badge-info'}`}>
                        {emp.salary_type === 'hourly' ? `⏰ ${emp.hourly_rate} MRU/ساعة` : '📅 شهري'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{emp.total_hours_worked} / {emp.expected_hours}</td>
                    <td style={{ fontWeight: 700, color: emp.total_absent_hours > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {emp.total_absent_hours} ساعة
                    </td>
                    <td>{formatCurrency(emp.gross_salary)}</td>
                    <td style={{ color: emp.attendance_deductions > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>-{formatCurrency(emp.attendance_deductions)}</td>
                    <td style={{ color: emp.task_deductions > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>-{formatCurrency(emp.task_deductions)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--danger)' }}>-{formatCurrency(emp.total_deductions)}</td>
                    <td style={{ fontWeight: 900, color: 'var(--success)', fontSize: '14px' }}>{formatCurrency(emp.net_salary)}</td>
                    <td>
                      <span className={`badge ${emp.salary_status === 'paid' ? 'badge-success' : emp.salary_record_exists ? 'badge-warning' : 'badge-muted'}`}>
                        {emp.salary_status === 'paid' ? '✅ مدفوع' : emp.salary_record_exists ? '⏳ معلق' : 'لم يُحسب'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="grid-2">
          {emps.map(emp => (
            <div key={emp.employee_id} className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px' }}>{emp.employee_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.job_title} — {emp.department_name}</div>
                </div>
                <span className={`badge ${emp.salary_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                  {emp.salary_status === 'paid' ? '✅ مدفوع' : '⏳ معلق'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div style={{ padding: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>ساعات العمل</div>
                  <div style={{ fontWeight: 700, color: 'var(--success)' }}>{emp.total_hours_worked} / {emp.expected_hours} ساعة</div>
                </div>
                <div style={{ padding: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>الغياب</div>
                  <div style={{ fontWeight: 700, color: emp.total_absent_hours > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{emp.total_absent_hours} ساعة ({emp.absent_days} يوم)</div>
                </div>
                <div style={{ padding: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>الإنتاجية</div>
                  <div style={{ fontWeight: 700, color: emp.productivity_rate >= 80 ? 'var(--success)' : 'var(--danger)' }}>
                    {emp.completed_tasks}/{emp.total_tasks} مهمة ({emp.productivity_rate}%)
                  </div>
                </div>
                <div style={{ padding: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>المهام المتأخرة</div>
                  <div style={{ fontWeight: 700, color: emp.delayed_tasks > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{emp.delayed_tasks} مهمة</div>
                </div>
              </div>

              <div className="divider" style={{ margin: '10px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>الراتب الخام: {formatCurrency(emp.gross_salary)}</span>
                <span style={{ color: 'var(--danger)' }}>الخصومات: -{formatCurrency(emp.total_deductions)}</span>
                <span style={{ fontWeight: 900, color: 'var(--success)', fontSize: '15px' }}>الصافي: {formatCurrency(emp.net_salary)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formula Tab (FM only) */}
      {activeTab === 'formula' && canManage && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 className="card-title" style={{ marginBottom: '20px' }}>🧮 معادلة احتساب الراتب</h2>

          <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-accent)', marginBottom: '20px' }}>
            <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', textAlign: 'center', marginBottom: '12px', fontFamily: 'monospace' }}>
              صافي الراتب = (ساعات العمل × سعر الساعة) - إجمالي الخصومات
            </div>
            <div style={{ fontSize: '14px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Net Salary = (Total Attended Hours × Hourly Rate) - Total Deductions
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="card" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--danger)', marginBottom: '12px' }}>⛔ خصم ساعات الغياب</h3>
              <ul style={{ fontSize: '13px', lineHeight: 2, color: 'var(--text-secondary)', paddingRight: '16px', listStyleType: 'disc' }}>
                <li>أيام العمل في الشهر: <strong>22 يوم</strong></li>
                <li>ساعات العمل اليومية: <strong>8 ساعات</strong></li>
                <li>الساعات المتوقعة: <strong>176 ساعة</strong></li>
                <li><strong style={{ color: 'var(--danger)' }}>شرط الأمان:</strong> إذا سجل الموظف أقل من <strong>ساعتين</strong> في أي يوم، يُحتسب اليوم بالكامل غياباً (8 ساعات خصم)</li>
                <li>خصم الغياب = ساعات الغياب × سعر الساعة</li>
              </ul>
            </div>
            <div className="card" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--danger)', marginBottom: '12px' }}>💔 جزاءات المهام</h3>
              <ul style={{ fontSize: '13px', lineHeight: 2, color: 'var(--text-secondary)', paddingRight: '16px', listStyleType: 'disc' }}>
                <li>يتم فحص جميع المهام في نهاية الشهر</li>
                <li>أي مهمة <strong>غير منجزة</strong> وتجاوزت تاريخ انتهائها</li>
                <li>يتم خصم <strong>قيمة الغرامة</strong> المحددة في المهمة تلقائياً</li>
                <li>المهام المتأخرة (أنجزت بعد الموعد) تُسجل لكن لا تُخصم</li>
                <li>قيمة الخصم تُضاف للخصومات الإجمالية</li>
              </ul>
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(39,174,96,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(39,174,96,0.2)', fontSize: '13px' }}>
            <strong style={{ color: 'var(--success)' }}>🔄 الأتمتة:</strong> النظام يحسب الرواتب تلقائياً عند فتح هذه الشاشة. اضغط "حساب الرواتب" لإنشاء/تحديث السجلات، ثم "تأكيد صرف الرواتب" لتسجيل المصروف وخصم المبلغ من تقييم الشركة.
          </div>
        </div>
      )}
    </div>
  );
}
