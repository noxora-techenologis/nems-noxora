'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/format';

export default function ReportsModule({ session }) {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [revenues, setRevenues] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/data/employees').then(r => r.json()),
      fetch('/api/data/attendance').then(r => r.json()),
      fetch('/api/data/tasks').then(r => r.json()),
      fetch('/api/data/revenues').then(r => r.json()),
      fetch('/api/data/expenses').then(r => r.json()),
      fetch('/api/data/salaries').then(r => r.json()),
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
