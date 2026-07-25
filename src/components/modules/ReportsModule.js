'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/format';
import { getAuthHeaders } from '@/lib/auth';

export default function ReportsModule({ session }) {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [revenues, setRevenues] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [payrollData, setPayrollData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [, setCurrTick] = useState(0);

  useEffect(() => {
    const handleCurrChange = () => setCurrTick(t => t + 1);
    window.addEventListener('currency-change', handleCurrChange);
    return () => window.removeEventListener('currency-change', handleCurrChange);
  }, []);

  const isCEO = ['ceo', 'admin'].includes(session.role_name?.toLowerCase());
  const isFM = session.role_name?.toLowerCase() === 'fm';

  useEffect(() => {
    Promise.all([
      fetch('/api/data/employees', { headers: getAuthHeaders() }).then(r => r.json()),
      fetch('/api/data/attendance', { headers: getAuthHeaders() }).then(r => r.json()),
      fetch('/api/data/tasks', { headers: getAuthHeaders() }).then(r => r.json()),
      fetch('/api/data/revenues', { headers: getAuthHeaders() }).then(r => r.json()),
      fetch('/api/data/expenses', { headers: getAuthHeaders() }).then(r => r.json()),
      fetch('/api/data/salaries', { headers: getAuthHeaders() }).then(r => r.json()),
    ]).then(([emp, att, tsk, rev, exp, sal]) => {
      setEmployees(emp.data || []);
      setAttendance(att.data || []);
      setTasks(tsk.data || []);
      setRevenues(rev.data || []);
      setExpenses(exp.data || []);
      setSalaries(sal.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const fetchPayroll = async () => {
    try {
      const res = await fetch(`/api/payroll?month=${selectedMonth}`, { headers: getAuthHeaders() });
      const data = await res.json();
      setPayrollData(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!loading) fetchPayroll();
  }, [loading, selectedMonth]);

  const handleGeneratePayroll = async () => {
    if (!confirm(`هل تريد إنشاء/تحديث سجلات الرواتب لشهر ${selectedMonth}؟`)) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ month: selectedMonth, _userId: session.user_id }),
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="animate-spin" style={{ fontSize: '32px' }}>⟳</div>
      </div>
    );
  }

  const avgEPI = employees.reduce((s, e) => s + (e.epi_score || 0), 0) / (employees.length || 1);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(0) : 0;
  const totalRevenue = revenues.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalSalaries = salaries.reduce((s, sal) => s + (Number(sal.net_salary) || 0), 0);
  const netProfit = totalRevenue - totalExpenses - totalSalaries;
  const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Print-only Header */}
      <div className="print-header" style={{ display: 'none' }}>
        <div>
          <div style={{ fontSize: '18pt', fontWeight: 900 }}>NEMS – تقرير شامل</div>
          <div style={{ fontSize: '10pt', color: '#555' }}>نظام إدارة موارد نوكسورا تكنولوجيز</div>
        </div>
        <div style={{ textAlign: 'left', fontSize: '10pt', color: '#555' }}>
          <div>تاريخ الطباعة: {today}</div>
          <div>أعدّه: {session?.name || 'المسؤول'}</div>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">📈 وحدة التقارير والتحليلات البيانية</h1>
          <p className="page-subtitle">استعراض تقارير الإنتاجية، سير العمل، وكفاءة الحضور</p>
        </div>
        <button id="print-report-btn" className="btn btn-primary btn-sm" onClick={handlePrint}>
          🖨️ طباعة / تصدير PDF
        </button>
      </div>

      {/* Financial Summary */}
      <div className="card" style={{ marginBottom: '20px', border: '1px solid var(--border-accent)' }}>
        <h2 className="card-title mb-4">💰 الملخص المالي الإجمالي</h2>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="stat-card green">
            <div className="stat-icon green">📈</div>
            <div className="stat-value" style={{ fontSize: '18px' }}>{formatCurrency(totalRevenue)}</div>
            <div className="stat-label">إجمالي الإيرادات</div>
          </div>
          <div className="stat-card red">
            <div className="stat-icon red">📉</div>
            <div className="stat-value" style={{ fontSize: '18px' }}>{formatCurrency(totalExpenses)}</div>
            <div className="stat-label">إجمالي المصروفات</div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-icon yellow">💼</div>
            <div className="stat-value" style={{ fontSize: '18px' }}>{formatCurrency(totalSalaries)}</div>
            <div className="stat-label">إجمالي الرواتب</div>
          </div>
          <div className={`stat-card ${netProfit >= 0 ? 'green' : 'red'}`}>
            <div className={`stat-icon ${netProfit >= 0 ? 'green' : 'red'}`}>{netProfit >= 0 ? '✅' : '⚠️'}</div>
            <div className="stat-value" style={{ fontSize: '18px', color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {formatCurrency(netProfit)}
            </div>
            <div className="stat-label">صافي الربح</div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-icon green">📈</div>
          <div className="stat-value">{avgEPI.toFixed(1)}%</div>
          <div className="stat-label">متوسط كفاءة الإنتاجية (EPI)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">📋</div>
          <div className="stat-value">{completionRate}%</div>
          <div className="stat-label">نسبة إنجاز المهام الكلية</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon yellow">⏱️</div>
          <div className="stat-value">{attendance.length}</div>
          <div className="stat-label">سجلات الحضور الكلية</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Performance Report */}
        <div className="card">
          <h2 className="card-title mb-4">🏆 تقييم أداء الموظفين (EPI)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {employees.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>لا يوجد موظفون مسجلون بعد</p>}
            {employees.map(emp => (
              <div key={emp.employee_id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{emp.employee_id} - {emp.job_title}</div>
                  <div className="progress-bar" style={{ marginTop: '4px' }}>
                    <div className="progress-fill green" style={{ width: `${emp.epi_score || 0}%` }} />
                  </div>
                </div>
                <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: '15px' }}>{emp.epi_score || 0}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Task Efficiency */}
        <div className="card">
          <h2 className="card-title mb-4">📊 كفاءة سير عمل المشاريع</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span>المهام المكتملة</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>{completedTasks} / {totalTasks}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill green" style={{ width: `${completionRate}%` }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span>المهام الجارية</span>
                <span style={{ fontWeight: 700, color: 'var(--warning)' }}>
                  {tasks.filter(t => t.status === 'in_progress').length}
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill yellow" style={{
                  width: totalTasks > 0 ? `${(tasks.filter(t => t.status === 'in_progress').length / totalTasks * 100).toFixed(0)}%` : '0%'
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payroll Generation Section (CEO/FM only) */}
      {(isCEO || isFM) && (
        <div className="card" style={{ marginTop: '20px', border: '2px solid var(--border-accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="card-title" style={{ margin: 0 }}>💰 توليد كشوف الرواتب الشهرية</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="month"
                className="form-input"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                style={{ width: '180px' }}
              />
              <button
                id="generate-payroll-btn"
                className="btn btn-primary"
                onClick={handleGeneratePayroll}
                disabled={generating}
              >
                {generating ? '⏳ جاري التوليد...' : '🚀 توليد كشوف الرواتب'}
              </button>
            </div>
          </div>

          {payrollData && payrollData.employees && (
            <div>
              <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '16px' }}>
                <div className="stat-card">
                  <div className="stat-value" style={{ fontSize: '16px' }}>{payrollData.totals?.employee_count || 0}</div>
                  <div className="stat-label">الموظفون النشطون</div>
                </div>
                <div className="stat-card green">
                  <div className="stat-value" style={{ fontSize: '16px' }}>{formatCurrency(payrollData.totals?.total_gross || 0)}</div>
                  <div className="stat-label">إجمالي الرواتب قبل الخصومات</div>
                </div>
                <div className="stat-card red">
                  <div className="stat-value" style={{ fontSize: '16px' }}>-{formatCurrency(payrollData.totals?.total_deductions || 0)}</div>
                  <div className="stat-label">إجمالي الخصومات</div>
                </div>
                <div className="stat-card green">
                  <div className="stat-value" style={{ fontSize: '16px' }}>{formatCurrency(payrollData.totals?.total_net || 0)}</div>
                  <div className="stat-label">صافي الرواتب المستحقة</div>
                </div>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>الموظف</th>
                      <th>النوع</th>
                      <th>ساعات العمل</th>
                      <th>الغياب</th>
                      <th>المنجز</th>
                      <th>غير المنجز</th>
                      <th>الراتب الإجمالي</th>
                      <th>خصم الحضور</th>
                      <th>خصم المهام</th>
                      <th>الصافي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollData.employees.map(emp => (
                      <tr key={emp.employee_id} id={`payroll-row-${emp.employee_id}`}>
                        <td style={{ fontWeight: 700 }}>{emp.employee_name}</td>
                        <td>
                          <span className={`badge ${emp.salary_type === 'hourly' ? 'badge-warning' : 'badge-info'}`}>
                            {emp.salary_type === 'hourly' ? `⏰ ${emp.hourly_rate} MRU/ساعة` : '📅 شهري'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>{emp.total_hours_worked}</td>
                        <td style={{ fontWeight: 700, color: emp.total_absent_hours > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{emp.total_absent_hours}</td>
                        <td><span className="badge badge-success">{emp.completed_tasks}</span></td>
                        <td><span className={`badge ${emp.uncompleted_tasks > 0 ? 'badge-danger' : 'badge-muted'}`}>{emp.uncompleted_tasks}</span></td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(emp.gross_salary)}</td>
                        <td style={{ color: 'var(--danger)' }}>-{formatCurrency(emp.attendance_deductions)}</td>
                        <td style={{ color: 'var(--danger)' }}>-{formatCurrency(emp.task_deductions)}</td>
                        <td style={{ fontWeight: 900, color: 'var(--success)' }}>{formatCurrency(emp.net_salary)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Salaries Table - printable */}
      {salaries.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h2 className="card-title mb-4">💼 جدول الرواتب التفصيلي</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>الراتب الأساسي</th>
                  <th>البدلات</th>
                  <th>الخصومات</th>
                  <th>الصافي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map(sal => (
                  <tr key={sal.salary_id}>
                    <td style={{ fontWeight: 700 }}>{sal.employee_id}</td>
                    <td>{formatCurrency(sal.base_salary)}</td>
                    <td style={{ color: 'var(--success)' }}>+{formatCurrency(sal.allowances)}</td>
                    <td style={{ color: 'var(--danger)' }}>-{formatCurrency(sal.deductions)}</td>
                    <td style={{ fontWeight: 800 }}>{formatCurrency(sal.net_salary)}</td>
                    <td>
                      <span className={`badge ${sal.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                        {sal.status === 'paid' ? 'مدفوع ✅' : 'معلق ⏳'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
