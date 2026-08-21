'use client';

import { useEffect, useState } from 'react';
import { formatCurrency as formatCurrencyImport, getPreferredCurrency } from '@/lib/format';
import { getAuthHeaders } from '@/lib/auth';

export default function DebtsModule({ session }) {
  const [debts, setDebts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [currTick, setCurrTick] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

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

  // Edit form
  const [editDebt, setEditDebt] = useState(null);

  const role = session.role_name?.toLowerCase() || '';
  const canManage = ['ceo', 'fm', 'admin'].includes(role);
  const canView = canManage || ['owner'].includes(role);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [debtRes, payRes] = await Promise.all([
        fetch('/api/data/company_debts', { headers: getAuthHeaders() }),
        fetch('/api/data/debt_payments', { headers: getAuthHeaders() }).catch(() => ({ ok: false })),
      ]);
      const debtData = await debtRes.json();
      const payData = payRes.ok ? await payRes.json() : { data: [] };
      setDebts(debtData.data || []);
      setPayments(payData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDebt = async (e) => {
    e.preventDefault();
    if (!debtorName || !amount) return;
    if (dueDate && borrowDate && dueDate < borrowDate) {
      alert('تاريخ الاستحقاق يجب أن يكون بعد تاريخ الاستدانة');
      return;
    }
    if (Number(amount) <= 0) {
      alert('قيمة الدين يجب أن تكون أكبر من صفر');
      return;
    }
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
        resetAddForm();
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

  const handleEditDebt = async (e) => {
    e.preventDefault();
    if (!editDebt) return;
    if (editDebt.due_date && editDebt.borrowing_date && editDebt.due_date < editDebt.borrowing_date) {
      alert('تاريخ الاستحقاق يجب أن يكون بعد تاريخ الاستدانة');
      return;
    }
    if (Number(editDebt.amount) <= 0) {
      alert('قيمة الدين يجب أن تكون أكبر من صفر');
      return;
    }
    try {
      const res = await fetch('/api/data/company_debts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          _id: editDebt.debt_id,
          _userId: session.user_id,
          debtor_name: editDebt.debtor_name,
          debtor_type: editDebt.debtor_type,
          amount: Number(editDebt.amount),
          borrowing_date: editDebt.borrowing_date,
          due_date: editDebt.due_date || null,
          description: editDebt.description || '',
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert('تم تعديل الدين بنجاح!');
        setEditDebt(null);
        fetchData();
      } else {
        alert(result.error || 'فشلت عملية التعديل');
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
      alert(`المبلغ يجب أن يكون بين 1 و ${formatCurrency(remaining)}`);
      return;
    }
    try {
      const newPaid = Number(selectedDebt.paid_amount) + payAmt;
      const newStatus = newPaid >= Number(selectedDebt.amount) ? 'paid' : 'partial';

      // 1. Update the debt
      const updateRes = await fetch('/api/data/company_debts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          _id: selectedDebt.debt_id,
          _userId: session.user_id,
          paid_amount: newPaid,
          status: newStatus,
        }),
      });
      const updateResult = await updateRes.json();
      if (!updateResult.success) {
        alert(updateResult.error || 'فشلت عملية السداد');
        return;
      }

      // 2. Record payment history
      await fetch('/api/data/debt_payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          debt_id: selectedDebt.debt_id,
          amount: payAmt,
          paid_date: new Date().toISOString().split('T')[0],
          note: payNote || null,
          created_by: session.user_id,
          _userId: session.user_id,
        }),
      });

      alert(`تم تسجيل سداد ${formatCurrency(payAmt)} بنجاح!`);
      setPayAmount('');
      setPayNote('');
      setShowPayForm(false);
      setSelectedDebt({ ...selectedDebt, paid_amount: newPaid, status: newStatus });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleDelete = async (debtId) => {
    if (!confirm('هل أنت متأكد من حذف هذا الدين؟ سيتم حذف جميع الدفعت أيضاً.')) return;
    try {
      const res = await fetch(`/api/data/company_debts?id=${debtId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() },
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

  const resetAddForm = () => {
    setDebtorName('');
    setDebtorType('عميل');
    setAmount('');
    setBorrowDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setDescription('');
  };

  const formatCurrency = (n) => formatCurrencyImport(n, 'MRU');

  const isOverdue = (d) => {
    if (!d.due_date || d.status === 'paid') return false;
    return new Date(d.due_date) < new Date(new Date().toDateString());
  };

  const daysOverdue = (d) => {
    if (!isOverdue(d)) return 0;
    const diff = new Date(new Date().toDateString()) - new Date(d.due_date);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  // Filtering
  let filtered = debts.filter(d => {
    const matchSearch = !search ||
      (d.debtor_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.description || '').toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || d.debtor_type === filterType;
    const matchStatus = !filterStatus ||
      (filterStatus === 'overdue' ? isOverdue(d) : d.status === filterStatus);
    return matchSearch && matchType && matchStatus;
  });

  // Sorting
  filtered.sort((a, b) => {
    let va, vb;
    switch (sortBy) {
      case 'debtor_name': va = a.debtor_name || ''; vb = b.debtor_name || ''; break;
      case 'amount': va = Number(a.amount); vb = Number(b.amount); break;
      case 'remaining': va = Number(a.amount) - Number(a.paid_amount); vb = Number(b.amount) - Number(b.paid_amount); break;
      case 'due_date': va = a.due_date || '9999-12-31'; vb = b.due_date || '9999-12-31'; break;
      case 'status': va = a.status; vb = b.status; break;
      default: va = a.created_at || ''; vb = b.created_at || '';
    }
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterType, filterStatus, sortBy, sortDir]);

  const totalOutstanding = debts
    .filter(d => d.status !== 'paid')
    .reduce((s, d) => s + (Number(d.amount) - Number(d.paid_amount)), 0);

  const overdueCount = debts.filter(d => isOverdue(d)).length;
  const overdueAmount = debts.filter(d => isOverdue(d))
    .reduce((s, d) => s + (Number(d.amount) - Number(d.paid_amount)), 0);

  const statusLabel = (s) => s === 'paid' ? 'تم السداد' : s === 'partial' ? 'مدفوع جزئياً' : 'مستحق';
  const statusColor = (s) => s === 'paid' ? 'var(--success)' : s === 'partial' ? 'var(--warning)' : 'var(--danger)';

  const getDebtPayments = (debtId) => payments.filter(p => p.debt_id === debtId).sort((a, b) => new Date(b.paid_date) - new Date(a.paid_date));

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const sortIcon = (field) => sortBy === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

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
          <button className="btn btn-primary" onClick={() => { setShowAddForm(!showAddForm); setEditDebt(null); }}>
            {showAddForm ? 'إلغاء' : '+ دين جديد'}
          </button>
        )}
      </div>

      {/* Summary Banner */}
      <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '160px', borderRight: '3px solid var(--danger)', paddingRight: '16px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>إجمالي المتبقة</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--danger)', marginTop: '4px' }}>{formatCurrency(totalOutstanding)}</div>
          </div>
          <div style={{ flex: 1, minWidth: '120px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--danger)' }}>{debts.filter(d => d.status === 'pending').length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>مستحقة</div>
          </div>
          <div style={{ flex: 1, minWidth: '120px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--warning)' }}>{debts.filter(d => d.status === 'partial').length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>جزئية</div>
          </div>
          <div style={{ flex: 1, minWidth: '120px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--success)' }}>{debts.filter(d => d.status === 'paid').length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>مدفوعة</div>
          </div>
          {overdueCount > 0 && (
            <div style={{ flex: 1, minWidth: '140px', textAlign: 'center', background: '#dc354515', borderRadius: '8px', padding: '8px 12px' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc3545' }}>⚠ {overdueCount}</div>
              <div style={{ fontSize: '11px', color: '#dc3545' }}>متأخرة — {formatCurrency(overdueAmount)}</div>
            </div>
          )}
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
                <label className="form-label">قيمة الدين ({getPreferredCurrency()})</label>
                <input type="number" className="form-input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required min="1" />
              </div>
              <div className="form-group">
                <label className="form-label">تاريخ الاستدانة</label>
                <input type="date" className="form-input" value={borrowDate} onChange={e => setBorrowDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">تاريخ الاستحقاق (اختياري)</label>
                <input type="date" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)} min={borrowDate} />
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

      {/* Filters & Search */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="🔍 بحث بالاسم أو الوصف..." className="form-input" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: '200px', padding: '8px 12px', fontSize: '13px' }} />
        <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '8px 12px', fontSize: '13px', minWidth: '140px' }}>
          <option value="">جميع الأنواع</option>
          <option value="عميل">عميل</option>
          <option value="رجل أعمال">رجل أعمال</option>
          <option value="جهة خارجية">جهة خارجية</option>
        </select>
        <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', fontSize: '13px', minWidth: '140px' }}>
          <option value="">جميع الحالات</option>
          <option value="pending">مستحق</option>
          <option value="partial">مدفوع جزئياً</option>
          <option value="paid">مدفوع</option>
          <option value="overdue">⚠ متأخر</option>
        </select>
      </div>

      <div className="grid-cols-2-1">
        {/* Debt List */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">سجل الديون ({filtered.length})</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('debtor_name')}>المدين{sortIcon('debtor_name')}</th>
                  <th>النوع</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('amount')}>المبلغ{sortIcon('amount')}</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('remaining')}>المتبقي{sortIcon('remaining')}</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('due_date')}>الاستحقاق{sortIcon('due_date')}</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('status')}>الحالة{sortIcon('status')}</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(d => {
                  const remaining = Number(d.amount) - Number(d.paid_amount);
                  const overdue = isOverdue(d);
                  return (
                    <tr
                      key={d.debt_id}
                      onClick={() => { setSelectedDebt(d); setShowPayForm(false); setEditDebt(null); }}
                      style={{ cursor: 'pointer', background: selectedDebt?.debt_id === d.debt_id ? 'var(--bg-card-hover)' : '', borderLeft: overdue ? '4px solid #dc3545' : '' }}
                    >
                      <td style={{ fontWeight: 700 }}>
                        {overdue && <span title={`متأخر ${daysOverdue(d)} يوم`} style={{ color: '#dc3545', marginRight: '4px' }}>⚠</span>}
                        {d.debtor_name}
                      </td>
                      <td style={{ fontSize: '12px' }}>{d.debtor_type}</td>
                      <td>{formatCurrency(d.amount)}</td>
                      <td style={{ color: remaining > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>{formatCurrency(remaining)}</td>
                      <td style={{ fontSize: '12px', color: overdue ? '#dc3545' : 'var(--text-muted)' }}>{d.due_date || '—'}</td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, color: overdue ? '#dc3545' : statusColor(d.status), background: overdue ? '#dc354515' : `${statusColor(d.status)}15` }}>
                          {overdue ? `متأخر ${daysOverdue(d)} يوم` : statusLabel(d.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لا توجد نتائج</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '12px', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>السابق</button>
              <span style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>التالي</button>
            </div>
          )}
        </div>

        {/* Details Panel */}
        <div>
          {selectedDebt ? (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">تفاصيل الدين</h2>
                {canManage && selectedDebt.status !== 'paid' && (
                  <button className="btn btn-primary btn-sm" onClick={() => { setShowPayForm(!showPayForm); setEditDebt(null); }}>
                    💰 سداد
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {isOverdue(selectedDebt) && (
                  <div style={{ padding: '10px 14px', background: '#dc354515', borderRadius: '8px', border: '1px solid #dc354530', fontSize: '13px', color: '#dc3545', fontWeight: 700 }}>
                    ⚠ هذا الدين متأخر منذ {daysOverdue(selectedDebt)} يوم — تاريخ الاستحقاق: {selectedDebt.due_date}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div className="user-avatar" style={{ width: '48px', height: '48px', fontSize: '18px', background: isOverdue(selectedDebt) ? '#dc3545' : statusColor(selectedDebt.status) }}>
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
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--warning)' }}>{formatCurrency(Number(selectedDebt.amount) - Number(selectedDebt.paid_amount))}</div>
                  </div>
                  <div>
                    <div className="form-label">الحالة</div>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, color: isOverdue(selectedDebt) ? '#dc3545' : statusColor(selectedDebt.status), background: isOverdue(selectedDebt) ? '#dc354515' : `${statusColor(selectedDebt.status)}15` }}>
                      {isOverdue(selectedDebt) ? `متأخر ${daysOverdue(selectedDebt)} يوم` : statusLabel(selectedDebt.status)}
                    </span>
                  </div>
                  <div>
                    <div className="form-label">تاريخ الاستدانة</div>
                    <div style={{ fontSize: '13px' }}>{selectedDebt.borrowing_date || '—'}</div>
                  </div>
                  <div>
                    <div className="form-label">تاريخ الاستحقاق</div>
                    <div style={{ fontSize: '13px', color: isOverdue(selectedDebt) ? '#dc3545' : 'inherit' }}>{selectedDebt.due_date || 'غير محدد'}</div>
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

                {/* Payment History */}
                {getDebtPayments(selectedDebt.debt_id).length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div className="form-label" style={{ marginBottom: '6px' }}>سجل الدفعات ({getDebtPayments(selectedDebt.debt_id).length})</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                      {getDebtPayments(selectedDebt.debt_id).map(p => (
                        <div key={p.payment_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '12px' }}>
                          <div>
                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(p.amount)}</span>
                            {p.note && <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>— {p.note}</span>}
                          </div>
                          <span style={{ color: 'var(--text-muted)' }}>{p.paid_date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pay Form */}
                {showPayForm && canManage && selectedDebt.status !== 'paid' && (
                  <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-accent)' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>تسجيل دفعة سداد</div>
                    <div className="form-group">
                      <label className="form-label">مبلغ السداد ({getPreferredCurrency()}) — المتبقي: {formatCurrency(Number(selectedDebt.amount) - Number(selectedDebt.paid_amount))}</label>
                      <input type="number" className="form-input" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="أدخل المبلغ" required min="1" max={Number(selectedDebt.amount) - Number(selectedDebt.paid_amount)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">ملاحظة (اختياري)</label>
                      <input type="text" className="form-input" value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="مثال: دفعة أولى" />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>تأكيد السداد</button>
                      <button type="button" className="btn btn-secondary" onClick={() => setShowPayForm(false)}>إلغاء</button>
                    </div>
                  </form>
                )}

                {/* Edit Form */}
                {editDebt && (
                  <form onSubmit={handleEditDebt} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-accent)' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>تعديل الدين</div>
                    <div className="form-group">
                      <label className="form-label">اسم المدين</label>
                      <input type="text" className="form-input" value={editDebt.debtor_name} onChange={e => setEditDebt({ ...editDebt, debtor_name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">نوع المدين</label>
                      <select className="form-select" value={editDebt.debtor_type} onChange={e => setEditDebt({ ...editDebt, debtor_type: e.target.value })}>
                        <option value="عميل">عميل</option>
                        <option value="رجل أعمال">رجل أعمال</option>
                        <option value="جهة خارجية">جهة خارجية</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">قيمة الدين ({getPreferredCurrency()})</label>
                      <input type="number" className="form-input" value={editDebt.amount} onChange={e => setEditDebt({ ...editDebt, amount: e.target.value })} min="1" required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="form-group">
                        <label className="form-label">تاريخ الاستدانة</label>
                        <input type="date" className="form-input" value={editDebt.borrowing_date || ''} onChange={e => setEditDebt({ ...editDebt, borrowing_date: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">تاريخ الاستحقاق</label>
                        <input type="date" className="form-input" value={editDebt.due_date || ''} onChange={e => setEditDebt({ ...editDebt, due_date: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">الوصف</label>
                      <input type="text" className="form-input" value={editDebt.description || ''} onChange={e => setEditDebt({ ...editDebt, description: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>حفظ التعديل</button>
                      <button type="button" className="btn btn-secondary" onClick={() => setEditDebt(null)}>إلغاء</button>
                    </div>
                  </form>
                )}

                {/* Action Buttons */}
                {canManage && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {selectedDebt.status !== 'paid' && !editDebt && (
                      <button className="btn btn-secondary btn-sm" onClick={() => { setEditDebt({ ...selectedDebt }); setShowPayForm(false); }}>✏️ تعديل</button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selectedDebt.debt_id)}>🗑️ حذف</button>
                  </div>
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
