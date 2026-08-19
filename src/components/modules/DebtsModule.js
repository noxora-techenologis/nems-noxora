'use client';

import { useEffect, useState } from 'react';
import { formatCurrency as formatCurrencyImport } from '@/lib/format';
import { getAuthHeaders } from '@/lib/auth';

export default function DebtsModule({ session }) {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [, setCurrTick] = useState(0);

  useEffect(() => {
    const handleCurrChange = () => setCurrTick(t => t + 1);
    window.addEventListener('currency-change', handleCurrChange);
    return () => window.removeEventListener('currency-change', handleCurrChange);
  }, []);

  // Add form
  const [debtorName, setDebtorName] = useState('');
  const [debtorType, setDebtorType] = useState('عميل');
  const [amount, setAmount] = useState('');
  const [borrowDate, setBorrowDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  const role = session.role_name?.toLowerCase() || '';
  const canManage = ['ceo', 'fm', 'admin'].includes(role);
  const canView = canManage || ['owner'].includes(role);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data/company_debts', { headers: getAuthHeaders() });
      const data = await res.json();
      setDebts(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDebt = async (e) => {
    e.preventDefault();
    if (!debtorName || !amount) return;
    try {
      const res = await fetch('/api/data/company_debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          debtor_name: debtorName,
          debtor_type: debtorType,
          amount: Number(amount),
          paid_amount: 0,
          borrowing_date: borrowDate,
          due_date: dueDate || null,
          description,
          status: 'pending',
          created_by: session.user_id,
          _userId: session.user_id,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert('تم تسجيل الدين بنجاح!');
        setDebtorName('');
        setDebtorType('عميل');
        setAmount('');
        setBorrowDate(new Date().toISOString().split('T')[0]);
        setDueDate('');
        setDescription('');
        setShowAddForm(false);
        fetchData();
      } else {
        alert(result.error || 'فشلت عملية الإضافة');
      }
    } catch (err) {
      console.error(err);
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!selectedDebt || !payAmount) return;
    const payAmt = Number(payAmount);
    const remaining = Number(selectedDebt.amount) - Number(selectedDebt.paid_amount);
    if (payAmt <= 0 || payAmt > remaining) {
      alert(`المبلغ يجب أن يكون بين 1 و ${remaining}`);
      return;
    }
    try {
      const newPaid = Number(selectedDebt.paid_amount) + payAmt;
      const newStatus = newPaid >= Number(selectedDebt.amount) ? 'paid' : 'partial';
      const res = await fetch('/api/data/company_debts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          _id: selectedDebt.debt_id,
          _userId: session.user_id,
          paid_amount: newPaid,
          status: newStatus,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert(`تم تسجيل سداد ${formatCurrency(payAmt)} بنجاح!`);
        setPayAmount('');
        setShowPayForm(false);
        setSelectedDebt({ ...selectedDebt, paid_amount: newPaid, status: newStatus });
        fetchData();
      } else {
        alert(result.error || 'فشلت عملية السداد');
      }
    } catch (err) {
      console.error(err);
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleDelete = async (debtId) => {
    if (!confirm('هل أنت متأكد من حذف هذا الدين؟')) return;
    try {
      const res = await fetch('/api/data/company_debts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ _id: debtId, _userId: session.user_id }),
      });
      const result = await res.json();
      if (result.success) {
        alert('تم الحذف بنجاح');
        setSelectedDebt(null);
        fetchData();
      } else {
        alert(result.error || 'فشلت عملية الحذف');
      }
    } catch (err) {
      console.error(err);
      alert('تعذر الاتصال بالخادم');
    }
  };

  const formatCurrency = (n) => formatCurrencyImport(n, 'MRU');

  const filtered = debts.filter(d =>
    (d.debtor_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalOutstanding = debts
    .filter(d => d.status !== 'paid')
    .reduce((s, d) => s + (Number(d.amount) - Number(d.paid_amount)), 0);

  const statusLabel = (s) => s === 'paid' ? 'تم السداد' : s === 'partial' ? 'مدفوع جزئياً' : 'مستحق';
  const statusColor = (s) => s === 'paid' ? 'var(--success)' : s === 'partial' ? 'var(--warning)' : 'var(--danger)';

  if (!canView) return null;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="animate-spin" style={{ fontSize: '32px' }}>⟳</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 ديون ومستحقات الشركة</h1>
          <p className="page-subtitle">توثيق المبالغ والخدمات المستعارة من الآخرين</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'إلغاء' : '+ دين جديد'}
          </button>
        )}
      </div>

      {/* Total Outstanding Banner */}
      <div style={{
        padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--danger)', marginBottom: '20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>إجمالي الديون المستحقة (المتبقة)</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--danger)', marginTop: '4px' }}>
            {formatCurrency(totalOutstanding)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--danger)' }}>
              {debts.filter(d => d.status === 'pending').length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>مستحقة</div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--warning)' }}>
              {debts.filter(d => d.status === 'partial').length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>جزئية</div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--success)' }}>
              {debts.filter(d => d.status === 'paid').length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>مدفوعة</div>
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && canManage && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <h2 className="card-title">➕ تسجيل دين جديد</h2>
          </div>
          <form onSubmit={handleAddDebt} style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '0 16px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">اسم المدين</label>
                <input type="text" className="form-input" value={debtorName} onChange={e => setDebtorName(e.target.value)} placeholder="اسم الشخص أو الجهة" required />
              </div>
              <div className="form-group">
                <label className="form-label">نوع المدين</label>
                <select className="form-select" value={debtorType} onChange={e => setDebtorType(e.target.value)}>
                  <option value="عميل">عميل</option>
                  <option value="رجل أعمال">رجل أعمال</option>
                  <option value="جهة خارجية">جهة خارجية</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">قيمة الدين (MRU)</label>
                <input type="number" className="form-input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required min="1" />
              </div>
              <div className="form-group">
                <label className="form-label">تاريخ الاستدانة</label>
                <input type="date" className="form-input" value={borrowDate} onChange={e => setBorrowDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">تاريخ الاستحقاق</label>
                <input type="date" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">البيان / الوصف</label>
              <input type="text" className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="تفاصيل الدين: استدانة خدمات، قرض مالي، إلخ" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>تسجيل الدين</button>
          </form>
        </div>
      )}

      <div className="grid-cols-2-1">
        {/* Debt List */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">سجل الديون ({filtered.length})</h2>
            <div style={{ width: '200px' }}>
              <input
                type="text"
                placeholder="بحث بالاسم أو الوصف..."
                className="form-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              />
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>المدين</th>
                  <th>النوع</th>
                  <th>المبلغ</th>
                  <th>المتبقي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const remaining = Number(d.amount) - Number(d.paid_amount);
                  return (
                    <tr
                      key={d.debt_id}
                      onClick={() => { setSelectedDebt(d); setShowPayForm(false); }}
                      style={{ cursor: 'pointer', background: selectedDebt?.debt_id === d.debt_id ? 'var(--bg-card-hover)' : '' }}
                    >
                      <td style={{ fontWeight: 700 }}>{d.debtor_name}</td>
                      <td>{d.debtor_type}</td>
                      <td>{formatCurrency(d.amount)}</td>
                      <td style={{ color: remaining > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                        {formatCurrency(remaining)}
                      </td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, color: statusColor(d.status), background: `${statusColor(d.status)}15` }}>
                          {statusLabel(d.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Details Panel */}
        <div>
          {selectedDebt ? (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">تفاصيل الدين</h2>
                {canManage && selectedDebt.status !== 'paid' && (
                  <button className="btn btn-primary btn-sm" onClick={() => setShowPayForm(!showPayForm)}>
                    💰 تسجيل سداد
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div className="user-avatar" style={{ width: '48px', height: '48px', fontSize: '18px', background: statusColor(selectedDebt.status) }}>
                    {selectedDebt.debtor_name?.[0] || 'D'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '16px' }}>{selectedDebt.debtor_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedDebt.debtor_type} | رقم: {selectedDebt.debt_id}</div>
                  </div>
                </div>

                <div className="divider" style={{ margin: '8px 0' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div className="form-label">قيمة الدين</div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--danger)' }}>{formatCurrency(selectedDebt.amount)}</div>
                  </div>
                  <div>
                    <div className="form-label">المبلغ المدفوع</div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--success)' }}>{formatCurrency(selectedDebt.paid_amount)}</div>
                  </div>
                  <div>
                    <div className="form-label">المتبقي</div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--warning)' }}>
                      {formatCurrency(Number(selectedDebt.amount) - Number(selectedDebt.paid_amount))}
                    </div>
                  </div>
                  <div>
                    <div className="form-label">الحالة</div>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, color: statusColor(selectedDebt.status), background: `${statusColor(selectedDebt.status)}15` }}>
                      {statusLabel(selectedDebt.status)}
                    </span>
                  </div>
                  <div>
                    <div className="form-label">تاريخ الاستدانة</div>
                    <div>{selectedDebt.borrowing_date}</div>
                  </div>
                  <div>
                    <div className="form-label">تاريخ الاستحقاق</div>
                    <div>{selectedDebt.due_date || 'غير محدد'}</div>
                  </div>
                </div>

                <div className="divider" style={{ margin: '8px 0' }} />

                <div>
                  <div className="form-label">البيان / الوصف</div>
                  <div style={{ fontSize: '13px' }}>{selectedDebt.description || 'بدون وصف'}</div>
                </div>

                {/* Payment Progress */}
                {selectedDebt.amount > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className="form-label">نسبة السداد</span>
                      <span style={{ fontWeight: 700, color: statusColor(selectedDebt.status) }}>
                        {((Number(selectedDebt.paid_amount) / Number(selectedDebt.amount)) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill green" style={{ width: `${(Number(selectedDebt.paid_amount) / Number(selectedDebt.amount)) * 100}%` }} />
                    </div>
                  </div>
                )}

                {/* Pay Form */}
                {showPayForm && canManage && selectedDebt.status !== 'paid' && (
                  <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-accent)' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>تسجيل دفعة سداد</div>
                    <div className="form-group">
                      <label className="form-label">مبلغ السداد (MRU) — المتبقي: {formatCurrency(Number(selectedDebt.amount) - Number(selectedDebt.paid_amount))}</label>
                      <input type="number" className="form-input" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="أدخل المبلغ" required min="1" max={Number(selectedDebt.amount) - Number(selectedDebt.paid_amount)} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>تأكيد السداد</button>
                      <button type="button" className="btn btn-secondary" onClick={() => setShowPayForm(false)}>إلغاء</button>
                    </div>
                  </form>
                )}

                {canManage && (
                  <button className="btn btn-danger btn-sm" style={{ alignSelf: 'flex-start', marginTop: '8px' }} onClick={() => handleDelete(selectedDebt.debt_id)}>
                    🗑️ حذف الدين
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
              <span>📋</span>
              <p style={{ marginTop: '8px' }}>حدد ديناً من القائمة لاستعراض تفاصيله</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
