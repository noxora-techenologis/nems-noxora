'use client';

import { useEffect, useState } from 'react';
import { formatCurrency as formatCurrencyImport } from '@/lib/format';
import DashboardLayout from '@/components/DashboardLayout';

export default function FMDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [, setCurrTick] = useState(0);

  useEffect(() => {
    const handleCurrChange = () => setCurrTick(t => t + 1);
    window.addEventListener('currency-change', handleCurrChange);
    return () => window.removeEventListener('currency-change', handleCurrChange);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/data/revenues').then(r => r.json()),
      fetch('/api/data/expenses').then(r => r.json()),
      fetch('/api/data/salaries').then(r => r.json()),
      fetch('/api/data/budgets').then(r => r.json()),
      fetch('/api/data/deduction_proposals').then(r => r.json()),
    ]).then(([revs, exps, sals, bud, deds]) => {
      setData({
        revenues: revs.data || [],
        expenses: exps.data || [],
        salaries: sals.data || [],
        budgets: bud.data || [],
        deductions: deds.data || [],
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div className="animate-spin" style={{ fontSize: '36px' }}>⟳</div>
        <p style={{ color: 'var(--text-secondary)' }}>جاري تحميل البيانات المالية...</p>
      </div>
    </DashboardLayout>
  );

  const { revenues = [], expenses = [], salaries = [], budgets = [], deductions = [] } = data || {};

  // Format using NEMS unified formatter (enforces Ghubariya numerals and MRU currency)
  const formatCurrency = (n) => formatCurrencyImport(n, 'MRU');

  const totalRevenue = revenues.filter(r => r.status === 'received').reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalSalaries = salaries.filter(s => s.payment_status === 'paid').reduce((s, r) => s + (r.net_salary || 0), 0);
  const pendingSalaries = salaries.filter(s => s.payment_status === 'pending').length;
  const pendingDeductions = deductions.filter(d => d.status === 'draft');
  const companyBudget = budgets.find(b => !b.project_id);

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">لوحة المدير المالي 💰</h1>
          <p className="page-subtitle">إدارة الإيرادات والمصروفات والرواتب</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button id="fm-add-revenue-btn" className="btn btn-secondary btn-sm">➕ إيراد جديد</button>
          <button id="fm-add-expense-btn" className="btn btn-primary btn-sm">➕ مصروف جديد</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-icon green">📈</div>
          <div className="stat-value" style={{ fontSize: '18px' }}>{formatCurrency(totalRevenue)}</div>
          <div className="stat-label">إجمالي الإيرادات</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">📉</div>
          <div className="stat-value" style={{ fontSize: '18px' }}>{formatCurrency(totalExpenses)}</div>
          <div className="stat-label">إجمالي المصروفات</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">💵</div>
          <div className="stat-value" style={{ fontSize: '18px' }}>{formatCurrency(totalSalaries)}</div>
          <div className="stat-label">الرواتب المصروفة</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon yellow">⏳</div>
          <div className="stat-value">{pendingSalaries}</div>
          <div className="stat-label">رواتب معلقة</div>
        </div>
      </div>

      {/* Budget Overview */}
      {companyBudget && (
        <div className="card mb-4">
          <div className="card-header">
            <h2 className="card-title">📊 ميزانية الشركة {companyBudget.period}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(companyBudget.total_amount)}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>إجمالي الميزانية</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--danger)' }}>{formatCurrency(companyBudget.spent_amount)}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>المنصرف</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(companyBudget.remaining_amount)}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>المتبقي</div>
            </div>
          </div>
          <div className="progress-bar" style={{ height: '10px' }}>
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(100, (companyBudget.spent_amount / companyBudget.total_amount) * 100)}%`,
                background: companyBudget.spent_amount / companyBudget.total_amount > 0.8 ? 'var(--grad-red)' : 'linear-gradient(90deg, #27AE60, #2ECC71)'
              }}
            />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'left' }}>
            {Math.round((companyBudget.spent_amount / companyBudget.total_amount) * 100)}% مُنصرف
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* Recent Revenues */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📈 الإيرادات الأخيرة</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>العنوان</th>
                  <th>المبلغ</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {revenues.map(r => (
                  <tr key={r.revenue_id} id={`rev-${r.revenue_id}`}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{r.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.date}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(r.amount)}</td>
                    <td><span className={`badge ${r.status === 'received' ? 'badge-success' : 'badge-warning'}`}>
                      {r.status === 'received' ? 'مُستلم' : 'معلق'}
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📉 المصروفات الأخيرة</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>العنوان</th>
                  <th>المبلغ</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.expense_id} id={`exp-${e.expense_id}`}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{e.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{e.date} · {e.vendor}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{formatCurrency(e.amount)}</td>
                    <td><span className={`badge ${e.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                      {e.status === 'approved' ? 'معتمد' : 'معلق'}
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pending Deductions */}
      {pendingDeductions.length > 0 && (
        <div className="card mt-4" style={{ border: '1px solid rgba(243, 156, 18, 0.3)' }}>
          <div className="card-header">
            <h2 className="card-title">✂️ مقترحات الخصومات المعلقة</h2>
            <span className="badge badge-warning">{pendingDeductions.length}</span>
          </div>
          {pendingDeductions.map(d => (
            <div key={d.deduction_id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)', marginBottom: '8px'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{d.reason}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>موظف: {d.employee_id}</div>
              </div>
              <div style={{ fontWeight: 800, color: 'var(--warning)', fontSize: '16px' }}>{formatCurrency(d.amount)}</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button id={`approve-ded-${d.deduction_id}`} className="btn btn-sm" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(39,174,96,0.3)' }}>✅</button>
                <button id={`reject-ded-${d.deduction_id}`} className="btn btn-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(231,76,60,0.3)' }}>❌</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
