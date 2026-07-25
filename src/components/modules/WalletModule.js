'use client';

import { useEffect, useState } from 'react';
import { formatCurrency as formatCurrencyImport } from '@/lib/format';

const TXN_TYPES = {
  deposit: { label: 'إيداع', icon: '💵', color: 'var(--success)' },
  withdrawal: { label: 'سحب', icon: '💸', color: 'var(--danger)' },
  investment: { label: 'استثمار', icon: '📈', color: 'var(--info)' },
  roi: { label: 'عائد استثمار', icon: '🏆', color: 'var(--noxora-yellow)' },
  salary: { label: 'راتب', icon: '💰', color: 'var(--success)' },
  penalty: { label: 'خصم', icon: '⚠️', color: 'var(--danger)' },
};

const TOPUP_STATUS = {
  pending: { label: 'قيد المراجعة', color: 'var(--warning)' },
  approved: { label: 'تم الشحن', color: 'var(--success)' },
  rejected: { label: 'مرفوض', color: 'var(--danger)' },
};

export default function WalletModule({ session }) {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [topupRequests, setTopupRequests] = useState([]);
  const [adminPending, setAdminPending] = useState([]);
  const [adminAll, setAdminAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('balance');
  const [, setCurrTick] = useState(0);

  // Top-up form
  const [topupAmount, setTopupAmount] = useState('');
  const [topupMethod, setTopupMethod] = useState('بنكيلي');
  const [topupProof, setTopupProof] = useState('');
  const [topupNotes, setTopupNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Withdraw form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');

  useEffect(() => {
    const handleCurrChange = () => setCurrTick(t => t + 1);
    window.addEventListener('currency-change', handleCurrChange);
    return () => window.removeEventListener('currency-change', handleCurrChange);
  }, []);

  const formatCurrency = (n) => formatCurrencyImport(n, 'MRU');
  const role = session.role_name?.toLowerCase() || '';
  const isFM = role === 'fm';
  const isAdmin = role === 'admin';

  useEffect(() => {
    fetchWallet();
    if (isFM) fetchAdmin();
  }, [session.user_id]);

  const fetchWallet = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wallet?userId=${session.user_id}`);
      const data = await res.json();
      setWallet(data.wallet);
      setTransactions(data.transactions || []);
      setTopupRequests(data.topup_requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmin = async () => {
    try {
      const res = await fetch('/api/wallet/admin');
      const data = await res.json();
      setAdminPending(data.pending || []);
      setAdminAll(data.all || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    const amount = Number(topupAmount);
    if (!amount || amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'topup',
          userId: session.user_id,
          amount,
          payment_method: topupMethod,
          proof_url: topupProof || null,
          notes: topupNotes || null,
          owner_id: session.owner_id || null,
          employee_id: session.employee_id || null,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setTopupAmount('');
        setTopupProof('');
        setTopupNotes('');
        fetchWallet();
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }
    if (!wallet || Number(wallet.balance) < amount) {
      alert('الرصيد غير كافٍ');
      return;
    }

    if (!confirm(`هل أنت متأكد من سحب ${amount} MRU من محفظتك؟`)) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'withdraw',
          userId: session.user_id,
          amount,
          notes: withdrawNotes || null,
          owner_id: session.owner_id || null,
          employee_id: session.employee_id || null,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setWithdrawAmount('');
        setWithdrawNotes('');
        fetchWallet();
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminAction = async (requestId, action) => {
    try {
      const res = await fetch('/api/wallet/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          action,
          approved_by: session.user_id,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        fetchAdmin();
      } else {
        alert(result.error || 'فشلت العملية');
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏦 المحفظة</h1>
          <p className="page-subtitle">
            {isFM ? 'إدارة شحن وسحب المحافظ — لوحة التحكم المالية' : 'رصيدك وحركاتك المالية — الشحن والسحب والاستثمار'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button className={`btn ${activeTab === 'balance' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('balance')}>
          💰 الرصيد
        </button>
        <button className={`btn ${activeTab === 'transactions' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('transactions')}>
          📋 السجل
        </button>
        <button className={`btn ${activeTab === 'topup' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('topup')}>
          ⬆️ شحن المحفظة
        </button>
        <button className={`btn ${activeTab === 'withdraw' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('withdraw')}>
          ⬇️ السحب
        </button>
        {isFM && (
          <button className={`btn ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('admin'); fetchAdmin(); }}>
            🔧 إدارة الشحن ({adminPending.length})
          </button>
        )}
      </div>

      {/* Balance Tab */}
      {activeTab === 'balance' && (
        <div>
          <div style={{
            padding: '24px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-accent)', marginBottom: '24px',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>الرصيد الحالي</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--noxora-yellow)' }}>{formatCurrency(wallet?.balance || 0)}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>MRU</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>إجمالي الإيداعات</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(wallet?.total_deposited || 0)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>إجمالي السحوبات</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--danger)' }}>{formatCurrency(wallet?.total_withdrawn || 0)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>إجمالي الاستثمارات</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--info)' }}>{formatCurrency(wallet?.total_invested || 0)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>إجمالي الأرباح</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(wallet?.total_earned || 0)}</div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat-card">
              <div className="stat-value" style={{ fontSize: '16px' }}>{transactions.length}</div>
              <div className="stat-label">إجمالي الحركات</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ fontSize: '16px' }}>{topupRequests.filter(t => t.status === 'pending').length}</div>
              <div className="stat-label">طلبات شحن معلقة</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ fontSize: '16px' }}>{topupRequests.filter(t => t.status === 'approved').length}</div>
              <div className="stat-label">شحنات مؤكدة</div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">سجل الحركات المالية ({transactions.length})</h2>
          </div>
          {transactions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد حركات بعد</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
              {transactions.map(txn => {
                const typeInfo = TXN_TYPES[txn.type] || { label: txn.type, icon: '📝', color: 'var(--text-muted)' };
                return (
                  <div key={txn.transaction_id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>{typeInfo.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{typeInfo.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {txn.description}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {new Date(txn.created_at).toLocaleDateString('ar-SA')} {new Date(txn.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{
                        fontWeight: 900, fontSize: '15px',
                        color: ['deposit', 'roi', 'salary'].includes(txn.type) ? 'var(--success)' : 'var(--danger)',
                      }}>
                        {['deposit', 'roi', 'salary'].includes(txn.type) ? '+' : '-'}{formatCurrency(txn.amount)}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        الرصيد: {formatCurrency(txn.balance_after)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Top-Up Tab */}
      {activeTab === 'topup' && (
        <div className="grid-2">
          {/* Top-Up Form */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">⬆️ شحن المحفظة</h2>
            </div>
            <form onSubmit={handleTopup} style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '0 16px 16px' }}>
              <div className="form-group">
                <label className="form-label">المبلغ (MRU)</label>
                <input
                  type="number"
                  className="form-input"
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  placeholder="أدخل المبلغ..."
                  required
                  min="1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">طريقة الدفع</label>
                <select className="form-select" value={topupMethod} onChange={e => setTopupMethod(e.target.value)}>
                  <option value="بنكيلي">بنكيلي</option>
                  <option value="تحويل بنكي">تحويل بنكي</option>
                  <option value="محفظة إلكترونية">محفظة إلكترونية</option>
                  <option value="كاش">كاش</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">إثبات التحويل (رابط صورة / لقطة شاشة)</label>
                <input
                  type="text"
                  className="form-input"
                  value={topupProof}
                  onChange={e => setTopupProof(e.target.value)}
                  placeholder="الصق رابط الإثبات هنا..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">ملاحظات</label>
                <input
                  type="text"
                  className="form-input"
                  value={topupNotes}
                  onChange={e => setTopupNotes(e.target.value)}
                  placeholder="رقم الحساب أو أي ملاحظات..."
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? '⏳ جاري الإرسال...' : '📤 إرسال طلب الشحن'}
              </button>
            </form>
          </div>

          {/* My Top-Up Requests */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">طلبات الشحن ({topupRequests.length})</h2>
            </div>
            {topupRequests.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد طلبات شحن</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
                {topupRequests.map(req => (
                  <div key={req.request_id} style={{
                    padding: '14px', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--success)' }}>{formatCurrency(req.amount)}</span>
                      <span style={{
                        padding: '2px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 700,
                        color: TOPUP_STATUS[req.status]?.color || 'var(--text-muted)',
                        background: `${TOPUP_STATUS[req.status]?.color || 'var(--text-muted)'}15`,
                      }}>
                        {TOPUP_STATUS[req.status]?.label || req.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {req.payment_method} — {new Date(req.created_at).toLocaleDateString('ar-SA')}
                    </div>
                    {req.notes && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{req.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Withdraw Tab */}
      {activeTab === 'withdraw' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">⬇️ سحب من المحفظة</h2>
            </div>
            <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '0 16px 16px' }}>
              <div style={{ padding: '12px', background: 'rgba(241,196,15,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(241,196,15,0.3)', fontSize: '13px', fontWeight: 700 }}>
                الرصيد المتاح: <span style={{ color: 'var(--noxora-yellow)' }}>{formatCurrency(wallet?.balance || 0)} MRU</span>
              </div>
              <div className="form-group">
                <label className="form-label">المبلغ المطلوب سحبه (MRU)</label>
                <input
                  type="number"
                  className="form-input"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder="0"
                  required
                  min="1"
                  max={wallet?.balance || 0}
                />
              </div>
              <div className="form-group">
                <label className="form-label">ملاحظات (رقم الحساب / وسيلة السحب)</label>
                <input
                  type="text"
                  className="form-input"
                  value={withdrawNotes}
                  onChange={e => setWithdrawNotes(e.target.value)}
                  placeholder="رقم الحساب البنكي أو رقم بنكيلي..."
                />
              </div>
              <button type="submit" className="btn btn-danger" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
                {submitting ? '⏳ جاري...' : '💸 سحب المبلغ'}
              </button>
            </form>
          </div>

          {/* Recent Withdrawals */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">آخر عمليات السحب</h2>
            </div>
            {transactions.filter(t => t.type === 'withdrawal').length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد عمليات سحب</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
                {transactions.filter(t => t.type === 'withdrawal').map(txn => (
                  <div key={txn.transaction_id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>💸 سحب</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(txn.created_at).toLocaleDateString('ar-SA')}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{txn.description}</div>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '15px', color: 'var(--danger)' }}>-{formatCurrency(txn.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Tab (FM only) */}
      {activeTab === 'admin' && isFM && (
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h2 className="card-title">🔧 طلبات الشحن المعلقة ({adminPending.length})</h2>
            </div>
            {adminPending.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد طلبات معلقة — كل شيء محدّث ✅</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
                {adminPending.map(req => (
                  <div key={req.request_id} style={{
                    padding: '16px', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-warning)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '14px' }}>طلب #{req.request_id}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>المستخدم: #{req.user_id}</div>
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '18px', color: 'var(--success)' }}>{formatCurrency(req.amount)} MRU</div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      الطريقة: {req.payment_method} | التاريخ: {new Date(req.created_at).toLocaleDateString('ar-SA')}
                    </div>
                    {req.notes && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>ملاحظات: {req.notes}</div>}
                    {req.proof_url && (
                      <div style={{ fontSize: '11px', marginBottom: '8px' }}>
                        <a href={req.proof_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)' }}>📎 عرض إثبات التحويل</a>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        className="btn btn-sm"
                        style={{ background: 'var(--success)', color: '#fff', borderColor: 'var(--success)' }}
                        onClick={() => handleAdminAction(req.request_id, 'approve')}
                      >
                        ✅ تأكيد الشحن
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleAdminAction(req.request_id, 'reject')}
                      >
                        ❌ رفض
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All Requests History */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">سجل جميع الطلبات ({adminAll.length})</h2>
            </div>
            {adminAll.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد سجلات</div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>المستخدم</th>
                      <th>المبلغ</th>
                      <th>الطريقة</th>
                      <th>التاريخ</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminAll.map(req => (
                      <tr key={req.request_id}>
                        <td>{req.request_id}</td>
                        <td>#{req.user_id}</td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(req.amount)}</td>
                        <td>{req.payment_method}</td>
                        <td style={{ fontSize: '12px' }}>{new Date(req.created_at).toLocaleDateString('ar-SA')}</td>
                        <td>
                          <span style={{
                            padding: '2px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 700,
                            color: TOPUP_STATUS[req.status]?.color || 'var(--text-muted)',
                            background: `${TOPUP_STATUS[req.status]?.color || 'var(--text-muted)'}15`,
                          }}>
                            {TOPUP_STATUS[req.status]?.label || req.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
