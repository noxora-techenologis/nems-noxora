'use client';

import { useEffect, useState, useMemo } from 'react';
import { formatCurrency as formatCurrencyImport } from '@/lib/format';
import { getAuthHeaders } from '@/lib/auth';

const EXPENSE_CATEGORIES = ['أصول وتجهيزات مكتبية', 'تراخيص برمجيات', 'بدلات ومصاريف سفر', 'إعلانات وتسويق', 'عمليات'];
const REVENUE_TYPES = ['عقود خارجية', 'مبيعات خدمات', 'استثمارات خارجية', 'عمولات'];
const EXPENSE_THRESHOLD = 5000;

export default function FinanceModule({ session }) {
  const [revenues, setRevenues] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [, setCurrTick] = useState(0);

  useEffect(() => {
    const handleCurrChange = () => setCurrTick(t => t + 1);
    window.addEventListener('currency-change', handleCurrChange);
    return () => window.removeEventListener('currency-change', handleCurrChange);
  }, []);

  // Form states — Revenue
  const [revTitle, setRevTitle] = useState('');
  const [revAmount, setRevAmount] = useState('');
  const [revType, setRevType] = useState('عقود خارجية');

  // Form states — Expense
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('أصول وتجهيزات مكتبية');
  const [expVendor, setExpVendor] = useState('');

  // Form states — Budget
  const [budgetName, setBudgetName] = useState('ميزانية الشركة');
  const [budgetAllocated, setBudgetAllocated] = useState('');
  const [budgetYear, setBudgetYear] = useState(new Date().getFullYear());
  const [budgetDesc, setBudgetDesc] = useState('');

  // Form states — Propose deduction
  const [propEmpId, setPropEmpId] = useState('');
  const [propType, setPropType] = useState('deduction');
  const [propAmount, setPropAmount] = useState('');
  const [propReason, setPropReason] = useState('');
  const [editingProposals, setEditingProposals] = useState({});

  // Edit modal states
  const [editingRevenue, setEditingRevenue] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingBudget, setEditingBudget] = useState(null);

  // Filter states
  const [revSearch, setRevSearch] = useState('');
  const [revFilterType, setRevFilterType] = useState('');
  const [revFilterDate, setRevFilterDate] = useState('');
  const [expSearch, setExpSearch] = useState('');
  const [expFilterCategory, setExpFilterCategory] = useState('');
  const [expFilterDate, setExpFilterDate] = useState('');

  const canManage = ['admin', 'ceo', 'fm'].includes(session.role_name.toLowerCase());
  const isHRorFM = ['hr', 'fm', 'admin', 'ceo'].includes(session.role_name.toLowerCase());
  const isCEO = session.role_name.toLowerCase() === 'ceo';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [revRes, expRes, salRes, dedRes, empRes, budRes] = await Promise.all([
        fetch('/api/data/revenues', { headers: getAuthHeaders() }),
        fetch('/api/data/expenses', { headers: getAuthHeaders() }),
        fetch('/api/data/salaries', { headers: getAuthHeaders() }),
        fetch('/api/data/deduction_proposals', { headers: getAuthHeaders() }),
        fetch('/api/data/employees', { headers: getAuthHeaders() }),
        fetch('/api/data/budgets', { headers: getAuthHeaders() }),
      ]);
      const [revData, expData, salData, dedData, empData, budData] = await Promise.all([
        revRes.json(), expRes.json(), salRes.json(), dedRes.json(), empRes.json(), budRes.json(),
      ]);

      setRevenues(revData.data || []);
      setExpenses(expData.data || []);
      setSalaries(salData.data || []);
      setDeductions(dedData.data || []);
      setEmployees(empData.data || []);
      setBudgets(budData.data || []);
      if (empData.data && empData.data.length > 0) setPropEmpId(empData.data[0].employee_id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (n) => formatCurrencyImport(n);

  // ─── REVENUE HANDLERS ───
  const handleAddRevenue = async (e) => {
    e.preventDefault();
    if (!revTitle || !revAmount) return;
    try {
      const res = await fetch('/api/data/revenues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          title: revTitle, amount: Number(revAmount), type: revType,
          currency: 'MRU', date: new Date().toISOString().split('T')[0],
          payment_method: 'تحويل بنكي', status: 'received',
          created_by: session.user_id, _userId: session.user_id,
        }),
      });
      const result = await res.json();
      if (result.success) {
        fetch('/api/valuation', { method: 'POST', headers: getAuthHeaders() }).catch(() => {});
        alert('تمت إضافة الإيراد بنجاح!');
        setRevTitle(''); setRevAmount('');
        fetchData();
      } else {
        alert(result.error || 'فشلت عملية الإضافة');
      }
    } catch (err) { console.error(err); alert('تعذر الاتصال بالخادم'); }
  };

  const handleUpdateRevenue = async (e) => {
    e.preventDefault();
    if (!editingRevenue) return;
    try {
      const res = await fetch('/api/data/revenues', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          _id: editingRevenue.revenue_id, _userId: session.user_id,
          title: editingRevenue.title, amount: Number(editingRevenue.amount),
          type: editingRevenue.type, date: editingRevenue.date,
          payment_method: editingRevenue.payment_method,
        }),
      });
      const result = await res.json();
      if (result.success) {
        fetch('/api/valuation', { method: 'POST', headers: getAuthHeaders() }).catch(() => {});
        alert('تم تحديث الإيراد بنجاح');
        setEditingRevenue(null); fetchData();
      } else { alert(result.error || 'فشلت العملية'); }
    } catch (err) { console.error(err); alert('تعذر الاتصال بالخادم'); }
  };

  const handleDeleteRevenue = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإيراد؟')) return;
    try {
      const res = await fetch(`/api/data/revenues?id=${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      const result = await res.json();
      if (result.success) {
        fetch('/api/valuation', { method: 'POST', headers: getAuthHeaders() }).catch(() => {});
        alert('تم حذف الإيراد بنجاح');
        fetchData();
      } else { alert(result.error || 'فشلت العملية'); }
    } catch (err) { console.error(err); alert('تعذر الاتصال بالخادم'); }
  };

  // ─── EXPENSE HANDLERS ───
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expTitle || !expAmount || !expVendor) return;
    const amt = Number(expAmount);
    if (amt > EXPENSE_THRESHOLD && !isCEO) {
      alert(`المصروف يتجاوز ${EXPENSE_THRESHOLD.toLocaleString()} MRU — يتطلب موافقة المدير العام (CEO)`);
      return;
    }
    try {
      const res = await fetch('/api/data/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          title: expTitle, amount: amt, category: expCategory, vendor: expVendor,
          currency: 'MRU', date: new Date().toISOString().split('T')[0],
          status: 'approved', approval_threshold: EXPENSE_THRESHOLD,
          created_by: session.user_id, approved_by: session.user_id,
          approved_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
          _userId: session.user_id,
        }),
      });
      const result = await res.json();
      if (result.success) {
        fetch('/api/valuation', { method: 'POST', headers: getAuthHeaders() }).catch(() => {});
        // Auto-update budget spent
        updateBudgetSpent(amt);
        alert('تمت إضافة المصروف بنجاح!');
        setExpTitle(''); setExpAmount(''); setExpVendor('');
        fetchData();
      } else { alert(result.error || 'فشلت عملية الإضافة'); }
    } catch (err) { console.error(err); alert('تعذر الاتصال بالخادم'); }
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    if (!editingExpense) return;
    try {
      const res = await fetch('/api/data/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          _id: editingExpense.expense_id, _userId: session.user_id,
          title: editingExpense.title, amount: Number(editingExpense.amount),
          category: editingExpense.category, vendor: editingExpense.vendor,
          date: editingExpense.date,
        }),
      });
      const result = await res.json();
      if (result.success) {
        fetch('/api/valuation', { method: 'POST', headers: getAuthHeaders() }).catch(() => {});
        alert('تم تحديث المصروف بنجاح');
        setEditingExpense(null); fetchData();
      } else { alert(result.error || 'فشلت العملية'); }
    } catch (err) { console.error(err); alert('تعذر الاتصال بالخادم'); }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    try {
      const res = await fetch(`/api/data/expenses?id=${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      const result = await res.json();
      if (result.success) {
        fetch('/api/valuation', { method: 'POST', headers: getAuthHeaders() }).catch(() => {});
        alert('تم حذف المصروف بنجاح');
        fetchData();
      } else { alert(result.error || 'فشلت العملية'); }
    } catch (err) { console.error(err); alert('تعذر الاتصال بالخادم'); }
  };

  // ─── BUDGET HANDLERS ───
  const updateBudgetSpent = async (expenseAmount) => {
    try {
      const budRes = await fetch('/api/data/budgets', { headers: getAuthHeaders() });
      const budData = await budRes.json();
      const currentBudget = (budData.data || []).find(b => !b.project_id && b.fiscal_year === new Date().getFullYear());
      if (currentBudget) {
        await fetch('/api/data/budgets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            _id: currentBudget.budget_id, _userId: session.user_id,
            spent: Number(currentBudget.spent || 0) + expenseAmount,
          }),
        });
      }
    } catch (err) { console.error('Budget update failed:', err); }
  };

  const handleAddBudget = async (e) => {
    e.preventDefault();
    if (!budgetAllocated) return;
    try {
      const res = await fetch('/api/data/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          name: budgetName, description: budgetDesc, project_id: null,
          allocated: Number(budgetAllocated), spent: 0, currency: 'MRU',
          fiscal_year: Number(budgetYear), _userId: session.user_id,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert('تم إنشاء الميزانية بنجاح!');
        setBudgetName('ميزانية الشركة'); setBudgetAllocated(''); setBudgetDesc('');
        fetchData();
      } else { alert(result.error || 'فشلت العملية'); }
    } catch (err) { console.error(err); alert('تعذر الاتصال بالخادم'); }
  };

  const handleUpdateBudget = async (e) => {
    e.preventDefault();
    if (!editingBudget) return;
    try {
      const res = await fetch('/api/data/budgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          _id: editingBudget.budget_id, _userId: session.user_id,
          name: editingBudget.name, allocated: Number(editingBudget.allocated),
          description: editingBudget.description, fiscal_year: Number(editingBudget.fiscal_year),
        }),
      });
      const result = await res.json();
      if (result.success) { alert('تم تحديث الميزانية'); setEditingBudget(null); fetchData(); }
      else { alert(result.error || 'فشلت العملية'); }
    } catch (err) { console.error(err); alert('تعذر الاتصال بالخادم'); }
  };

  const handleDeleteBudget = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه الميزانية؟')) return;
    try {
      const res = await fetch(`/api/data/budgets?id=${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      const result = await res.json();
      if (result.success) { alert('تم حذف الميزانية'); fetchData(); }
      else { alert(result.error || 'فشلت العملية'); }
    } catch (err) { console.error(err); alert('تعذر الاتصال بالخادم'); }
  };

  // ─── DEDUCTION HANDLERS ───
  const handleApproveDeduction = async (id, status, amount, reason) => {
    try {
      const body = { _id: id, _userId: session.user_id, status, approved_by: session.user_id, approved_at: new Date().toISOString().replace('T', ' ').substring(0, 19) };
      if (amount !== undefined) body.amount = Number(amount);
      if (reason !== undefined) body.reason = reason;
      const res = await fetch('/api/data/deduction_proposals', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(body) });
      const result = await res.json();
      if (result.success) { alert(`تم ${status === 'approved' ? 'اعتماد' : 'رفض'} المقترح بنجاح`); fetchData(); }
      else { alert(result.error || 'فشلت العملية'); }
    } catch (err) { console.error(err); alert('تعذر الاتصال بالخادم'); }
  };

  const handleProposeDeduction = async (e) => {
    e.preventDefault();
    if (!propEmpId || !propAmount || !propReason) { alert('يرجى تعبئة كافة حقول المقترح'); return; }
    try {
      const res = await fetch('/api/data/deduction_proposals', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ employee_id: propEmpId, amount: Number(propAmount), reason: propReason, type: propType, status: 'draft', created_by: session.user_id, _userId: session.user_id }),
      });
      const result = await res.json();
      if (result.success) { alert('تم تقديم المقترح بنجاح!'); setPropAmount(''); setPropReason(''); fetchData(); }
      else { alert(result.error || 'فشلت العملية'); }
    } catch (err) { console.error(err); alert('تعذر الاتصال بالخادم'); }
  };

  // ─── FILTERED DATA ───
  const filteredRevenues = useMemo(() => {
    return revenues.filter(r => {
      if (revSearch && !r.title?.toLowerCase().includes(revSearch.toLowerCase()) && !r.type?.toLowerCase().includes(revSearch.toLowerCase())) return false;
      if (revFilterType && r.type !== revFilterType) return false;
      if (revFilterDate && r.date !== revFilterDate) return false;
      return true;
    });
  }, [revenues, revSearch, revFilterType, revFilterDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (expSearch && !e.title?.toLowerCase().includes(expSearch.toLowerCase()) && !e.vendor?.toLowerCase().includes(expSearch.toLowerCase())) return false;
      if (expFilterCategory && e.category !== expFilterCategory) return false;
      if (expFilterDate && e.date !== expFilterDate) return false;
      return true;
    });
  }, [expenses, expSearch, expFilterCategory, expFilterDate]);

  if (loading) {
    return (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}><div className="animate-spin" style={{ fontSize: '32px' }}>⟳</div></div>);
  }

  const totalRev = revenues.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalExp = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netIncome = totalRev - totalExp;
  const activeBudget = budgets.find(b => !b.project_id && b.fiscal_year === new Date().getFullYear());

  const inputStyle = { padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px', width: '100%' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💰 الإدارة المالية والميزانيات</h1>
          <p className="page-subtitle">نظام محاسبة الإيرادات، المدفوعات، والميزانيات</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {['summary', 'revenues', 'expenses', 'salaries', 'budgets', 'deductions'].map(tab => (
          <button key={tab} className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab(tab)}>
            {tab === 'summary' && '📊 ملخص'}
            {tab === 'revenues' && `📈 المقبوضات (${revenues.length})`}
            {tab === 'expenses' && `📉 المدفوعات (${expenses.length})`}
            {tab === 'salaries' && '💵 الرواتب'}
            {tab === 'budgets' && '📋 الميزانيات'}
            {tab === 'deductions' && `✂️ خصومات (${deductions.filter(d => d.status === 'draft').length})`}
          </button>
        ))}
      </div>

      {/* ─── SUMMARY TAB ─── */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="stats-grid">
            <div className="stat-card green"><div className="stat-icon green">📈</div><div className="stat-value">{formatCurrency(totalRev)}</div><div className="stat-label">إجمالي المقبوضات</div></div>
            <div className="stat-card"><div className="stat-icon red">📉</div><div className="stat-value">{formatCurrency(totalExp)}</div><div className="stat-label">إجمالي المدفوعات</div></div>
            <div className="stat-card"><div className="stat-icon green">🏆</div><div className="stat-value" style={{ color: netIncome >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(netIncome)}</div><div className="stat-label">صافي رصيد الخزينة</div></div>
            {activeBudget && (
              <div className="stat-card yellow"><div className="stat-icon yellow">📋</div><div className="stat-value">{activeBudget.allocated > 0 ? Math.round((activeBudget.spent / activeBudget.allocated) * 100) : 0}%</div><div className="stat-label">نسبة استخدام الميزانية</div></div>
            )}
          </div>

          {canManage && (
            <div className="grid-2">
              <div className="card">
                <div className="card-header"><h3 className="card-title">📈 تسجيل دفعة واردة</h3></div>
                <form onSubmit={handleAddRevenue} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group"><label className="form-label">البيان / الوصف</label><input id="rev-title" type="text" className="form-input" value={revTitle} onChange={e => setRevTitle(e.target.value)} placeholder="مثال: الدفعة الأولى من العقد..." required /></div>
                  <div className="form-group"><label className="form-label">المبلغ (MRU)</label><input id="rev-amount" type="number" className="form-input" value={revAmount} onChange={e => setRevAmount(e.target.value)} placeholder="0.00" required /></div>
                  <div className="form-group"><label className="form-label">التصنيف</label><select id="rev-type" className="form-select" value={revType} onChange={e => setRevType(e.target.value)}>{REVENUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <button id="submit-rev-btn" type="submit" className="btn btn-primary w-full">تأكيد وتخزين الإيراد</button>
                </form>
              </div>

              <div className="card">
                <div className="card-header"><h3 className="card-title">📉 تسجيل مصروف خارجي</h3></div>
                <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group"><label className="form-label">بيان الصرف</label><input id="exp-title" type="text" className="form-input" value={expTitle} onChange={e => setExpTitle(e.target.value)} placeholder="شراء تراخيص..." required /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group"><label className="form-label">المبلغ (MRU)</label><input id="exp-amount" type="number" className="form-input" value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="0.00" required />{Number(expAmount) > EXPENSE_THRESHOLD && !isCEO && <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '4px' }}>⚠️ يتطلب موافقة CEO</div>}</div>
                    <div className="form-group"><label className="form-label">المورد</label><input id="exp-vendor" type="text" className="form-input" value={expVendor} onChange={e => setExpVendor(e.target.value)} placeholder="اسم المورد..." required /></div>
                  </div>
                  <div className="form-group"><label className="form-label">التصنيف</label><select id="exp-category" className="form-select" value={expCategory} onChange={e => setExpCategory(e.target.value)}>{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <button id="submit-exp-btn" type="submit" className="btn btn-primary w-full">تأكيد وتثبيت المصروف</button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── REVENUES TAB ─── */}
      {activeTab === 'revenues' && (
        <div className="card">
          <div className="card-header"><h2 className="card-title">📈 سجل المقبوضات والإيرادات</h2></div>
          <div style={{ display: 'flex', gap: '10px', padding: '12px 16px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-primary)' }}>
            <input type="text" placeholder="🔍 بحث بالعنوان أو النوع..." value={revSearch} onChange={e => setRevSearch(e.target.value)} style={{ ...inputStyle, maxWidth: '250px' }} />
            <select value={revFilterType} onChange={e => setRevFilterType(e.target.value)} style={{ ...inputStyle, maxWidth: '180px' }}>
              <option value="">جميع الأنواع</option>
              {REVENUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="date" value={revFilterDate} onChange={e => setRevFilterDate(e.target.value)} style={{ ...inputStyle, maxWidth: '180px' }} />
            {(revSearch || revFilterType || revFilterDate) && <button className="btn btn-secondary btn-sm" onClick={() => { setRevSearch(''); setRevFilterType(''); setRevFilterDate(''); }}>مسح الفلتر</button>}
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>البند</th><th>التصنيف</th><th>المبلغ</th><th>التاريخ</th><th>الوسيلة</th><th>الحالة</th>{canManage && <th>إجراءات</th>}</tr></thead>
              <tbody>
                {filteredRevenues.map(r => (
                  <tr key={r.revenue_id}>
                    <td style={{ fontWeight: 800 }}>{r.title}</td>
                    <td>{r.type}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 800 }}>{formatCurrency(r.amount)}</td>
                    <td>{r.date}</td>
                    <td>{r.payment_method}</td>
                    <td><span className="badge badge-success">مستلمة ✓</span></td>
                    {canManage && (
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditingRevenue({ ...r })}>✏️</button>
                          <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteRevenue(r.revenue_id)}>🗑️</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredRevenues.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>لا توجد نتائج</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── EXPENSES TAB ─── */}
      {activeTab === 'expenses' && (
        <div className="card">
          <div className="card-header"><h2 className="card-title">📉 سجل المدفوعات والمصروفات</h2></div>
          <div style={{ display: 'flex', gap: '10px', padding: '12px 16px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-primary)' }}>
            <input type="text" placeholder="🔍 بحث بالعنوان أو المورد..." value={expSearch} onChange={e => setExpSearch(e.target.value)} style={{ ...inputStyle, maxWidth: '250px' }} />
            <select value={expFilterCategory} onChange={e => setExpFilterCategory(e.target.value)} style={{ ...inputStyle, maxWidth: '200px' }}>
              <option value="">جميع التصنيفات</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="date" value={expFilterDate} onChange={e => setExpFilterDate(e.target.value)} style={{ ...inputStyle, maxWidth: '180px' }} />
            {(expSearch || expFilterCategory || expFilterDate) && <button className="btn btn-secondary btn-sm" onClick={() => { setExpSearch(''); setExpFilterCategory(''); setExpFilterDate(''); }}>مسح الفلتر</button>}
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>البند</th><th>التصنيف</th><th>المورد</th><th>المبلغ</th><th>التاريخ</th><th>الحالة</th>{canManage && <th>إجراءات</th>}</tr></thead>
              <tbody>
                {filteredExpenses.map(ex => (
                  <tr key={ex.expense_id}>
                    <td style={{ fontWeight: 800 }}>{ex.title}</td>
                    <td>{ex.category}</td>
                    <td>{ex.vendor}</td>
                    <td style={{ color: 'var(--danger)', fontWeight: 800 }}>-{formatCurrency(ex.amount)}</td>
                    <td>{ex.date}</td>
                    <td><span className={`badge ${ex.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>{ex.status === 'approved' ? 'معتمد ✓' : 'معلق'}</span></td>
                    {canManage && (
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditingExpense({ ...ex })}>✏️</button>
                          <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteExpense(ex.expense_id)}>🗑️</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredExpenses.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>لا توجد نتائج</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── SALARIES TAB ─── */}
      {activeTab === 'salaries' && (
        <div className="card">
          <div className="card-header"><h2 className="card-title">💵 بيانات وكشوف الرواتب</h2></div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>الموظف</th><th>الشهر</th><th>الأساسي</th><th>البدلات</th><th>الخصومات</th><th>الصافي</th><th>الحالة</th></tr></thead>
              <tbody>
                {salaries.map(s => (
                  <tr key={s.salary_id}>
                    <td style={{ fontWeight: 800, color: 'var(--noxora-yellow-light)' }}>{s.employee_id}</td>
                    <td>{s.month}</td>
                    <td>{formatCurrency(s.base_salary)}</td>
                    <td style={{ color: 'var(--success)' }}>+{formatCurrency(s.allowances)}</td>
                    <td style={{ color: 'var(--danger)' }}>-{formatCurrency(s.deductions)}</td>
                    <td style={{ fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(s.net_salary)}</td>
                    <td><span className={`badge ${s.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{s.payment_status === 'paid' ? 'تم الصرف ✅' : 'قيد الصرف ⏳'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── BUDGETS TAB ─── */}
      {activeTab === 'budgets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Budget Card */}
          {activeBudget && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">📊 الميزانية النشطة — {activeBudget.fiscal_year}</h2>
                {canManage && <button className="btn btn-secondary btn-sm" onClick={() => setEditingBudget({ ...activeBudget })}>✏️ تعديل</button>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(activeBudget.allocated)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>إجمالي الميزانية</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--danger)' }}>{formatCurrency(activeBudget.spent)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>المنصرف</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(Math.max(0, activeBudget.allocated - activeBudget.spent))}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>المتبقي</div>
                </div>
              </div>
              <div className="progress-bar" style={{ height: '12px' }}>
                <div className="progress-fill" style={{
                  width: `${Math.min(100, activeBudget.allocated > 0 ? (activeBudget.spent / activeBudget.allocated) * 100 : 0)}%`,
                  background: activeBudget.allocated > 0 && (activeBudget.spent / activeBudget.allocated) > 0.8 ? 'var(--grad-red)' : 'linear-gradient(90deg, #27AE60, #2ECC71)'
                }} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                {activeBudget.allocated > 0 ? Math.round((activeBudget.spent / activeBudget.allocated) * 100) : 0}% مُنصرف — {activeBudget.name || 'ميزانية الشركة'}
              </div>
            </div>
          )}

          {/* Create Budget Form */}
          {canManage && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">➕ إنشاء ميزانية جديدة</h3></div>
              <form onSubmit={handleAddBudget} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group"><label className="form-label">اسم الميزانية</label><input type="text" className="form-input" value={budgetName} onChange={e => setBudgetName(e.target.value)} placeholder="مثال: ميزانية الشركة 2026" required /></div>
                  <div className="form-group"><label className="form-label">المبلغ المخصص (MRU)</label><input type="number" className="form-input" value={budgetAllocated} onChange={e => setBudgetAllocated(e.target.value)} placeholder="0.00" required /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group"><label className="form-label">السنة المالية</label><input type="number" className="form-input" value={budgetYear} onChange={e => setBudgetYear(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">الوصف</label><input type="text" className="form-input" value={budgetDesc} onChange={e => setBudgetDesc(e.target.value)} placeholder="وصف الميزانية..." /></div>
                </div>
                <button type="submit" className="btn btn-primary w-full">إنشاء الميزانية</button>
              </form>
            </div>
          )}

          {/* All Budgets List */}
          {budgets.length > 0 && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">📋 جميع الميزانيات</h3></div>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>الاسم</th><th>السنة</th><th>المخصص</th><th>المنصرف</th><th>المتبقي</th><th>النسبة</th>{canManage && <th>إجراءات</th>}</tr></thead>
                  <tbody>
                    {budgets.map(b => {
                      const pct = b.allocated > 0 ? Math.round((b.spent / b.allocated) * 100) : 0;
                      return (
                        <tr key={b.budget_id}>
                          <td style={{ fontWeight: 800 }}>{b.name || 'ميزانية'}</td>
                          <td>{b.fiscal_year}</td>
                          <td>{formatCurrency(b.allocated)}</td>
                          <td style={{ color: 'var(--danger)' }}>{formatCurrency(b.spent)}</td>
                          <td style={{ color: 'var(--success)' }}>{formatCurrency(Math.max(0, b.allocated - b.spent))}</td>
                          <td><span className={`badge ${pct > 80 ? 'badge-danger' : pct > 50 ? 'badge-warning' : 'badge-success'}`}>{pct}%</span></td>
                          {canManage && (
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => setEditingBudget({ ...b })}>✏️</button>
                                <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteBudget(b.budget_id)}>🗑️</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── DEDUCTIONS TAB ─── */}
      {activeTab === 'deductions' && (
        <div style={{ display: 'grid', gridTemplateColumns: isHRorFM ? '2fr 1fr' : '1fr', gap: '20px' }}>
          <div className="card">
            <div className="card-header"><h2 className="card-title">طلبات الخصومات والمكافآت المعلقة</h2></div>
            {deductions.filter(d => d.status === 'draft').length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>✅ لا توجد طلبات معلقة</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {deductions.filter(d => d.status === 'draft').map(d => {
                  const isReward = d.type === 'reward';
                  const editState = editingProposals[d.deduction_id] || { amount: d.amount, reason: d.reason };
                  return (
                    <div key={d.deduction_id} style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {isCEO ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--noxora-yellow-light)' }}>📝 تعديل واعتماد — {d.employee_id} ({isReward ? '🏆 مكافأة' : '✂️ خصم'})</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px' }}>
                            <input type="text" className="form-input" value={editState.reason} onChange={(e) => setEditingProposals({ ...editingProposals, [d.deduction_id]: { ...editState, reason: e.target.value } })} placeholder="سبب المقترح..." />
                            <input type="number" className="form-input" value={editState.amount} onChange={(e) => setEditingProposals({ ...editingProposals, [d.deduction_id]: { ...editState, amount: e.target.value } })} placeholder="المبلغ..." />
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
                            <button className="btn btn-sm btn-primary" onClick={() => handleApproveDeduction(d.deduction_id, 'approved', editState.amount, editState.reason)}>✅ اعتماد</button>
                            <button className="btn btn-sm btn-secondary" style={{ color: 'var(--danger)' }} onClick={() => handleApproveDeduction(d.deduction_id, 'rejected')}>❌ رفض</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div><div style={{ fontWeight: 800, fontSize: '14px' }}>{isReward ? '🏆' : '✂️'} {d.reason}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>موظف: {d.employee_id}</div></div>
                          <div style={{ fontSize: '18px', fontWeight: 900, color: isReward ? 'var(--success)' : 'var(--danger)' }}>{isReward ? '+' : '-'}{formatCurrency(d.amount)}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {isHRorFM && (
            <div className="card" style={{ height: 'fit-content' }}>
              <div className="card-header"><h3 className="card-title">🚀 تقديم مقترح مالي</h3></div>
              <form onSubmit={handleProposeDeduction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group"><label className="form-label">الموظف</label><select className="form-select" value={propEmpId} onChange={e => setPropEmpId(e.target.value)}>{employees.map(emp => <option key={emp.employee_id} value={emp.employee_id}>{emp.job_title} (#{emp.employee_id})</option>)}</select></div>
                <div className="form-group"><label className="form-label">النوع</label><select className="form-select" value={propType} onChange={e => setPropType(e.target.value)}><option value="deduction">✂️ خصم</option><option value="reward">🏆 مكافأة</option></select></div>
                <div className="form-group"><label className="form-label">المبلغ (MRU)</label><input type="number" className="form-input" value={propAmount} onChange={e => setPropAmount(e.target.value)} required /></div>
                <div className="form-group"><label className="form-label">السبب</label><textarea className="form-textarea" value={propReason} onChange={e => setPropReason(e.target.value)} required style={{ minHeight: '80px' }} /></div>
                <button type="submit" className="btn btn-primary w-full">🚀 رفع المقترح</button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ─── EDIT MODALS ─── */}

      {/* Edit Revenue Modal */}
      {editingRevenue && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditingRevenue(null)}>
          <div className="card" style={{ width: '90%', maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="card-header"><h3 className="card-title">✏️ تعديل الإيراد</h3></div>
            <form onSubmit={handleUpdateRevenue} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group"><label className="form-label">العنوان</label><input type="text" className="form-input" value={editingRevenue.title} onChange={e => setEditingRevenue({ ...editingRevenue, title: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">المبلغ</label><input type="number" className="form-input" value={editingRevenue.amount} onChange={e => setEditingRevenue({ ...editingRevenue, amount: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">النوع</label><select className="form-select" value={editingRevenue.type} onChange={e => setEditingRevenue({ ...editingRevenue, type: e.target.value })}>{REVENUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="form-group"><label className="form-label">التاريخ</label><input type="date" className="form-input" value={editingRevenue.date?.split('T')[0] || ''} onChange={e => setEditingRevenue({ ...editingRevenue, date: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: '8px' }}><button type="submit" className="btn btn-primary w-full">حفظ</button><button type="button" className="btn btn-secondary w-full" onClick={() => setEditingRevenue(null)}>إلغاء</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditingExpense(null)}>
          <div className="card" style={{ width: '90%', maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="card-header"><h3 className="card-title">✏️ تعديل المصروف</h3></div>
            <form onSubmit={handleUpdateExpense} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group"><label className="form-label">العنوان</label><input type="text" className="form-input" value={editingExpense.title} onChange={e => setEditingExpense({ ...editingExpense, title: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">المبلغ</label><input type="number" className="form-input" value={editingExpense.amount} onChange={e => setEditingExpense({ ...editingExpense, amount: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">المورد</label><input type="text" className="form-input" value={editingExpense.vendor} onChange={e => setEditingExpense({ ...editingExpense, vendor: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">التصنيف</label><select className="form-select" value={editingExpense.category} onChange={e => setEditingExpense({ ...editingExpense, category: e.target.value })}>{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="form-group"><label className="form-label">التاريخ</label><input type="date" className="form-input" value={editingExpense.date?.split('T')[0] || ''} onChange={e => setEditingExpense({ ...editingExpense, date: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: '8px' }}><button type="submit" className="btn btn-primary w-full">حفظ</button><button type="button" className="btn btn-secondary w-full" onClick={() => setEditingExpense(null)}>إلغاء</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Budget Modal */}
      {editingBudget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditingBudget(null)}>
          <div className="card" style={{ width: '90%', maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="card-header"><h3 className="card-title">✏️ تعديل الميزانية</h3></div>
            <form onSubmit={handleUpdateBudget} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group"><label className="form-label">الاسم</label><input type="text" className="form-input" value={editingBudget.name || ''} onChange={e => setEditingBudget({ ...editingBudget, name: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">المبلغ المخصص</label><input type="number" className="form-input" value={editingBudget.allocated} onChange={e => setEditingBudget({ ...editingBudget, allocated: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">السنة المالية</label><input type="number" className="form-input" value={editingBudget.fiscal_year} onChange={e => setEditingBudget({ ...editingBudget, fiscal_year: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">الوصف</label><input type="text" className="form-input" value={editingBudget.description || ''} onChange={e => setEditingBudget({ ...editingBudget, description: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: '8px' }}><button type="submit" className="btn btn-primary w-full">حفظ</button><button type="button" className="btn btn-secondary w-full" onClick={() => setEditingBudget(null)}>إلغاء</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
