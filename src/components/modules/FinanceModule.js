'use client';

import { useEffect, useState } from 'react';
import { formatCurrency as formatCurrencyImport } from '@/lib/format';

export default function FinanceModule({ session }) {
  const [revenues, setRevenues] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary'); // summary, revenues, expenses, salaries, deductions
  const [, setCurrTick] = useState(0);

  useEffect(() => {
    const handleCurrChange = () => setCurrTick(t => t + 1);
    window.addEventListener('currency-change', handleCurrChange);
    return () => window.removeEventListener('currency-change', handleCurrChange);
  }, []);

  // Form states
  const [revTitle, setRevTitle] = useState('');
  const [revAmount, setRevAmount] = useState('');
  const [revType, setRevType] = useState('عقود خارجية');

  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('أصول وتجهيزات مكتبية');
  const [expVendor, setExpVendor] = useState('');

  // Propose deduction/reward state
  const [propEmpId, setPropEmpId] = useState('');
  const [propType, setPropType] = useState('deduction'); // deduction, reward
  const [propAmount, setPropAmount] = useState('');
  const [propReason, setPropReason] = useState('');
  const [editingProposals, setEditingProposals] = useState({});

  const canManage = ['admin', 'ceo', 'fm'].includes(session.role_name.toLowerCase());
  const isHRorFM = ['hr', 'fm', 'admin', 'ceo'].includes(session.role_name.toLowerCase());
  const isCEO = session.role_name.toLowerCase() === 'ceo';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [revRes, expRes, salRes, dedRes, empRes] = await Promise.all([
        fetch('/api/data/revenues'),
        fetch('/api/data/expenses'),
        fetch('/api/data/salaries'),
        fetch('/api/data/deduction_proposals'),
        fetch('/api/data/employees'),
      ]);
      const revData = await revRes.json();
      const expData = await expRes.json();
      const salData = await salRes.json();
      const dedData = await dedRes.json();
      const empData = await empRes.json();

      setRevenues(revData.data || []);
      setExpenses(expData.data || []);
      setSalaries(salData.data || []);
      setDeductions(dedData.data || []);
      setEmployees(empData.data || []);
      if (empData.data && empData.data.length > 0) {
        setPropEmpId(empData.data[0].employee_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRevenue = async (e) => {
    e.preventDefault();
    if (!revTitle || !revAmount) return;

    try {
      const res = await fetch('/api/data/revenues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: revTitle,
          amount: Number(revAmount),
          type: revType,
          currency: 'SAR',
          date: new Date().toISOString().split('T')[0],
          payment_method: 'تحويل بنكي',
          status: 'received',
          created_by: session.user_id,
          _userId: session.user_id,
        }),
      });

      const result = await res.json();
      if (result.success) {
        alert('تمت إضافة الإيراد بنجاح!');
        setRevTitle('');
        setRevAmount('');
        fetchData();
      } else {
        alert(result.error || 'فشلت عملية الإضافة');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expTitle || !expAmount || !expVendor) return;

    try {
      const res = await fetch('/api/data/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: expTitle,
          amount: Number(expAmount),
          category: expCategory,
          vendor: expVendor,
          currency: 'SAR',
          date: new Date().toISOString().split('T')[0],
          status: 'approved',
          approval_threshold: 5000,
          created_by: session.user_id,
          approved_by: session.user_id,
          approved_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
          _userId: session.user_id,
        }),
      });

      const result = await res.json();
      if (result.success) {
        alert('تمت إضافة المصروف بنجاح!');
        setExpTitle('');
        setExpAmount('');
        setExpVendor('');
        fetchData();
      } else {
        alert(result.error || 'فشلت عملية الإضافة');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleApproveDeduction = async (id, status, amount, reason) => {
    try {
      const body = {
        _id: id,
        _userId: session.user_id,
        status: status,
        approved_by: session.user_id,
        approved_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      if (amount !== undefined) body.amount = Number(amount);
      if (reason !== undefined) body.reason = reason;

      const res = await fetch('/api/data/deduction_proposals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (result.success) {
        alert(`تم ${status === 'approved' ? 'اعتماد' : 'رفض'} المقترح بنجاح`);
        fetchData();
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleProposeDeduction = async (e) => {
    e.preventDefault();
    if (!propEmpId || !propAmount || !propReason) {
      alert('يرجى تعبئة كافة حقول المقترح');
      return;
    }

    try {
      const res = await fetch('/api/data/deduction_proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: propEmpId,
          amount: Number(propAmount),
          reason: propReason,
          type: propType,
          status: 'draft',
          created_by: session.user_id,
          _userId: session.user_id
        })
      });

      const result = await res.json();
      if (result.success) {
        alert('تم تقديم المقترح الإداري بنجاح بانتظار موافقة المدير العام!');
        setPropAmount('');
        setPropReason('');
        fetchData();
      } else {
        alert(result.error || 'فشلت إضافة المقترح');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="animate-spin" style={{ fontSize: '32px' }}>⟳</div>
      </div>
    );
  }

  // Format using NEMS unified formatter (enforces Ghubariya numerals and USD/MRU currency)
  const formatCurrency = (n, curr = 'MRU') => formatCurrencyImport(n, curr);

  const totalRev = revenues.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalExp = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netIncome = totalRev - totalExp;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💰 الإدارة المالية والميزانيات</h1>
          <p className="page-subtitle">نظام محاسبة الإيرادات، المدفوعات، وإقرار كشوف الرواتب الشهرية</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {['summary', 'revenues', 'expenses', 'salaries', 'deductions'].map(tab => (
          <button
            key={tab}
            id={`tab-fin-${tab}`}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'summary' && '📊 ملخص الخزينة'}
            {tab === 'revenues' && '📈 المقبوضات'}
            {tab === 'expenses' && '📉 المدفوعات'}
            {tab === 'salaries' && '💵 الرواتب'}
            {tab === 'deductions' && `✂️ خصومات معلقة (${deductions.filter(d => d.status === 'draft').length})`}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="stats-grid">
            <div className="stat-card green">
              <div className="stat-icon green">📈</div>
              <div className="stat-value">{formatCurrency(totalRev, 'SAR')}</div>
              <div className="stat-label">إجمالي المقبوضات</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red">📉</div>
              <div className="stat-value">{formatCurrency(totalExp, 'SAR')}</div>
              <div className="stat-label">إجمالي المدفوعات</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">🏆</div>
              <div className="stat-value" style={{ color: netIncome >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {formatCurrency(netIncome, 'SAR')}
              </div>
              <div className="stat-label">صافي رصيد الخزينة</div>
            </div>
          </div>

          {canManage && (
            <div className="grid-2">
              {/* Form Add Rev */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">📈 تسجيل دفعة واردة</h3>
                </div>
                <form onSubmit={handleAddRevenue} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">البيان / الوصف</label>
                    <input
                      id="rev-title"
                      type="text"
                      className="form-input"
                      value={revTitle}
                      onChange={e => setRevTitle(e.target.value)}
                      placeholder="مثال: الدفعة الأولى من العقد الإضافي..."
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">المبلغ (SAR)</label>
                    <input
                      id="rev-amount"
                      type="number"
                      className="form-input"
                      value={revAmount}
                      onChange={e => setRevAmount(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">نوع وتصنيف الإيراد</label>
                    <select
                      id="rev-type"
                      className="form-select"
                      value={revType}
                      onChange={e => setRevType(e.target.value)}
                    >
                      <option value="عقود خارجية">عقود خارجية</option>
                      <option value="مبيعات خدمات">مبيعات خدمات</option>
                      <option value="استثمارات خارجية">استثمارات خارجية</option>
                    </select>
                  </div>
                  <button id="submit-rev-btn" type="submit" className="btn btn-primary w-full" style={{ marginTop: '8px' }}>
                    تأكيد وتخزين الإيراد
                  </button>
                </form>
              </div>

              {/* Form Add Exp */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">📉 تسجيل مصروف خارجى</h3>
                </div>
                <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">بيان الصرف / البند</label>
                    <input
                      id="exp-title"
                      type="text"
                      className="form-input"
                      value={expTitle}
                      onChange={e => setExpTitle(e.target.value)}
                      placeholder="شراء تراخيص برمجية..."
                      required
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">المبلغ (SAR)</label>
                      <input
                        id="exp-amount"
                        type="number"
                        className="form-input"
                        value={expAmount}
                        onChange={e => setExpAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">المورد / الجهة المستلمة</label>
                      <input
                        id="exp-vendor"
                        type="text"
                        className="form-input"
                        value={expVendor}
                        onChange={e => setExpVendor(e.target.value)}
                        placeholder="مثال: أمازون ويب سيرفسز..."
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">التصنيف المحاسبي</label>
                    <select
                      id="exp-category"
                      className="form-select"
                      value={expCategory}
                      onChange={e => setExpCategory(e.target.value)}
                    >
                      <option value="أصول وتجهيزات مكتبية">أصول وتجهيزات مكتبية</option>
                      <option value="تراخيص برمجيات">تراخيص برمجيات</option>
                      <option value="بدلات ومصاريف سفر">بدلات ومصاريف سفر</option>
                      <option value="إعلانات وتسويق">إعلانات وتسويق</option>
                    </select>
                  </div>
                  <button id="submit-exp-btn" type="submit" className="btn btn-primary w-full" style={{ marginTop: '8px' }}>
                    تأكيد وتثبيت المصروف
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'revenues' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">سجل المقبوضات والإيرادات الواردة</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>البند / الوصف</th>
                  <th>التصنيف</th>
                  <th>المبلغ</th>
                  <th>التاريخ</th>
                  <th>طريقة الدفع</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {revenues.map(r => (
                  <tr key={r.revenue_id} id={`rev-row-${r.revenue_id}`}>
                    <td style={{ fontWeight: 800 }}>{r.title}</td>
                    <td>{r.type}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 800 }}>{formatCurrency(r.amount, r.currency)}</td>
                    <td>{r.date}</td>
                    <td>{r.payment_method}</td>
                    <td><span className="badge badge-success">مستلمة ✓</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">سجل المدفوعات والمصروفات الخارجية</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>البند / البيان</th>
                  <th>التصنيف والمحاسبة</th>
                  <th>المورد المستلم</th>
                  <th>المبلغ</th>
                  <th>التاريخ</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.expense_id} id={`exp-row-${e.expense_id}`}>
                    <td style={{ fontWeight: 800 }}>{e.title}</td>
                    <td>{e.category}</td>
                    <td>{e.vendor}</td>
                    <td style={{ color: 'var(--danger)', fontWeight: 800 }}>-{formatCurrency(e.amount, e.currency)}</td>
                    <td>{e.date}</td>
                    <td><span className="badge badge-success">معتمد ✓</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'salaries' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">بيانات وكشوف الرواتب والبدلات</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>الموظف المستهدف</th>
                  <th>الدورة الشهرية</th>
                  <th>الراتب الأساسي</th>
                  <th>البدلات والمزايا</th>
                  <th>الخصومات والجزاءات</th>
                  <th>الصافي المستحق</th>
                  <th>حالة التحويل</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map(s => (
                  <tr key={s.salary_id} id={`sal-row-${s.salary_id}`}>
                    <td style={{ fontWeight: 800, color: 'var(--noxora-yellow-light)' }}>{s.employee_id}</td>
                    <td>{s.month}</td>
                    <td>{formatCurrency(s.base_salary)}</td>
                    <td style={{ color: 'var(--success)' }}>+{formatCurrency(s.allowances)}</td>
                    <td style={{ color: 'var(--danger)' }}>-{formatCurrency(s.deductions)}</td>
                    <td style={{ fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(s.net_salary)}</td>
                    <td>
                      <span className={`badge ${s.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                        {s.payment_status === 'paid' ? 'تم الصرف ✅' : 'قيد الصرف ⏳'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'deductions' && (
        <div style={{ display: 'grid', gridTemplateColumns: isHRorFM ? '2fr 1fr' : '1fr', gap: '20px' }}>
          
          {/* List of pending proposals */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">طلبات ومقترحات الخصومات والمكافآت المعلقة</h2>
            </div>
            
            {deductions.filter(d => d.status === 'draft').length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                ✅ لا توجد أي طلبات خصم أو مكافآت معلقة حالياً في النظام
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {deductions.filter(d => d.status === 'draft').map(d => {
                  const isReward = d.type === 'reward';
                  const editState = editingProposals[d.deduction_id] || { amount: d.amount, reason: d.reason };
                  
                  return (
                    <div key={d.deduction_id} id={`ded-row-${d.deduction_id}`} style={{
                      padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', gap: '12px'
                    }}>
                      
                      {isCEO ? (
                        // CEO Edit and Approve Mode
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--noxora-yellow-light)' }}>
                            📝 تعديل واعتماد مقترح لـ: {d.employee_id} ({isReward ? '🏆 مكافأة' : '✂️ خصم'})
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px' }}>
                            <input
                              type="text"
                              className="form-input"
                              value={editState.reason}
                              onChange={(e) => setEditingProposals({
                                ...editingProposals,
                                [d.deduction_id]: { ...editState, reason: e.target.value }
                              })}
                              placeholder="سبب المقترح..."
                            />
                            <input
                              type="number"
                              className="form-input"
                              value={editState.amount}
                              onChange={(e) => setEditingProposals({
                                ...editingProposals,
                                [d.deduction_id]: { ...editState, amount: e.target.value }
                              })}
                              placeholder="المبلغ..."
                            />
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end', marginTop: '4px' }}>
                            <button
                              id={`approve-ded-${d.deduction_id}`}
                              className="btn btn-sm btn-primary"
                              onClick={() => handleApproveDeduction(d.deduction_id, 'approved', editState.amount, editState.reason)}
                            >
                              ✅ اعتماد بالطلب والتعديل
                            </button>
                            <button
                              id={`reject-ded-${d.deduction_id}`}
                              className="btn btn-sm btn-secondary"
                              style={{ color: 'var(--danger)', borderColor: 'rgba(231, 76, 60, 0.3)' }}
                              onClick={() => handleApproveDeduction(d.deduction_id, 'rejected')}
                            >
                              ❌ رفض الطلب
                            </button>
                          </div>
                        </div>
                      ) : (
                        // HR/FM Read-Only View
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
                              {isReward ? '🏆 مكافأة: ' : '✂️ خصم: '}{d.reason}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              الموظف: {d.employee_id} · الحالة: معلق لاعتماد المدير العام
                            </div>
                          </div>
                          
                          <div style={{ fontSize: '18px', fontWeight: 900, color: isReward ? 'var(--success)' : 'var(--danger)', marginLeft: '12px' }}>
                            {isReward ? '+' : '-'}{formatCurrency(d.amount)}
                          </div>
                        </div>
                      )}
                      
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form to propose a new Deduction or Reward */}
          {isHRorFM && (
            <div className="card" style={{ height: 'fit-content' }}>
              <div className="card-header">
                <h3 className="card-title">🚀 تقديم مقترح مالي</h3>
              </div>
              <form onSubmit={handleProposeDeduction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">الموظف المعني</label>
                  <select
                    id="prop-emp-select"
                    className="form-select"
                    value={propEmpId}
                    onChange={e => setPropEmpId(e.target.value)}
                  >
                    {employees.map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.job_title} ({emp.employee_id})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">نوع المقترح</label>
                  <select
                    id="prop-type-select"
                    className="form-select"
                    value={propType}
                    onChange={e => setPropType(e.target.value)}
                  >
                    <option value="deduction">✂️ خصم أو عقوبة مالية</option>
                    <option value="reward">🏆 مكافأة أو حافز إضافي</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">المبلغ المقترح (MRU)</label>
                  <input
                    id="prop-amount-input"
                    type="number"
                    className="form-input"
                    value={propAmount}
                    onChange={e => setPropAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">السبب والتبرير الإداري</label>
                  <textarea
                    id="prop-reason-input"
                    className="form-textarea"
                    value={propReason}
                    onChange={e => setPropReason(e.target.value)}
                    placeholder="اكتب التبرير الإداري أو رصد المخالفة بالتفصيل..."
                    required
                    style={{ minHeight: '80px' }}
                  />
                </div>

                <button id="submit-proposal-btn" type="submit" className="btn btn-primary w-full" style={{ marginTop: '8px' }}>
                  🚀 رفع المقترح للمدير العام
                </button>
              </form>
            </div>
          )}
          
        </div>
      )}
    </div>
  );
}
