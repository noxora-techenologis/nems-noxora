'use client';

import { useEffect, useState, useRef } from 'react';
import { formatCurrency as formatCurrencyImport } from '@/lib/format';
import { calcWithdrawalFee } from '@/lib/fees';
import { getAuthHeaders } from '@/lib/auth';

const BANKILY_NUMBER = '30426837';

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

  // Top-up form — Bankily
  const [topupAmount, setTopupAmount] = useState('');
  const [senderName, setSenderName] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [bankilyTxnId, setBankilyTxnId] = useState('');
  const [txnIdError, setTxnIdError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Withdraw form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [topupNotes, setTopupNotes] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');

  const PAYMENT_METHODS = [
    { value: 'bankily', label: 'بنكيلي', placeholder: 'رقم بنكيلي...' },
    { value: 'bank_account', label: 'حساب بنكي', placeholder: 'رقم الحساب البنكي + اسم البنك...' },
    { value: 'paypal', label: 'بايبال', placeholder: 'البريد الإلكتروني لحساب بايبال...' },
    { value: 'binance', label: 'بينانس', placeholder: 'معرف بينانس (UID)...' },
  ];

  const withdrawFeeInfo = withdrawAmount && Number(withdrawAmount) > 0
    ? calcWithdrawalFee(Number(withdrawAmount))
    : null;

  useEffect(() => {
    const handleCurrChange = () => setCurrTick(t => t + 1);
    window.addEventListener('currency-change', handleCurrChange);
    return () => window.removeEventListener('currency-change', handleCurrChange);
  }, []);

  const formatCurrency = (n) => formatCurrencyImport(n, 'MRU');
  const role = session.role_name?.toLowerCase() || '';
  const isFM = role === 'fm';

  useEffect(() => {
    fetchWallet();
    if (isFM) fetchAdmin();
  }, [session.user_id]);

  const fetchWallet = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wallet?userId=${session.user_id}`, { headers: getAuthHeaders() });
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
      const res = await fetch('/api/wallet/admin', { headers: getAuthHeaders() });
      const data = await res.json();
      setAdminPending(data.pending || []);
      setAdminAll(data.all || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Validate 19-digit transaction ID
  const validateTxnId = (val) => {
    setBankilyTxnId(val);
    if (!val) {
      setTxnIdError('');
      return;
    }
    if (!/^\d+$/.test(val)) {
      setTxnIdError('يجب أن يحتوي على أرقام فقط');
    } else if (val.length !== 19) {
      setTxnIdError(`المطلوب 19 رقماً — المدخل: ${val.length} رقم`);
    } else {
      setTxnIdError('');
    }
  };

  // Handle screenshot file selection
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار صورة فقط');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة يجب أن يكون أقل من 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotPreview(reader.result);
      setScreenshotFile(file);
    };
    reader.readAsDataURL(file);
  };

  const isFormValid = () => {
    return topupAmount && Number(topupAmount) > 0
      && senderName.trim()
      && screenshotPreview
      && bankilyTxnId.length === 19 && /^\d{19}$/.test(bankilyTxnId)
      && !txnIdError;
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    if (!isFormValid()) {
      alert('يرجى تعبئة جميع الحقول بشكل صحيح');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload screenshot
      let screenshotUrl = '';
      if (screenshotPreview) {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ file: screenshotPreview, filename: `bankily_${bankilyTxnId}.jpg` }),
        });
        const uploadData = await uploadRes.json();
        if (uploadData.url) {
          screenshotUrl = uploadData.url;
        } else {
          alert('فشل رفع الصورة');
          setSubmitting(false);
          return;
        }
      }

      // 2. Submit top-up request
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          action: 'topup',
          userId: session.user_id,
          amount: Number(topupAmount),
          sender_name: senderName.trim(),
          screenshot_url: screenshotUrl,
          bankily_txn_id: bankilyTxnId,
          owner_id: session.owner_id || null,
          employee_id: session.employee_id || null,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setTopupAmount('');
        setSenderName('');
        setScreenshotPreview('');
        setScreenshotFile(null);
        setBankilyTxnId('');
        setTopupNotes('');
        fetchWallet();
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch (err) {
      console.error(err);
      alert('تعذر الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) { alert('يرجى إدخال مبلغ صحيح'); return; }
    if (!wallet || Number(wallet.balance) < amount) { alert('الرصيد غير كافٍ'); return; }
    if (!confirm(`هل أنت متأكد من سحب ${amount} MRU من محفظتك؟`)) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          action: 'withdraw',
          userId: session.user_id,
          amount,
          payment_method: withdrawMethod || null,
          account_details: withdrawAccount || null,
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
    } catch (err) {
      console.error(err);
      alert('تعذر الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminAction = async (requestId, action) => {
    try {
      const res = await fetch('/api/wallet/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ request_id: requestId, action, approved_by: session.user_id }),
      });
      const result = await res.json();
      if (result.success) { alert(result.message); fetchAdmin(); }
      else { alert(result.error || 'فشلت العملية'); }
    } catch (err) {
      console.error(err);
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
        <button className={`btn ${activeTab === 'balance' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('balance')}>💰 الرصيد</button>
        <button className={`btn ${activeTab === 'transactions' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('transactions')}>📋 السجل</button>
        <button className={`btn ${activeTab === 'topup' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('topup')}>⬆️ شحن المحفظة</button>
        <button className={`btn ${activeTab === 'withdraw' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('withdraw')}>⬇️ السحب</button>
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
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txn.description}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {new Date(txn.created_at).toLocaleDateString('ar-SA')} {new Date(txn.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 900, fontSize: '15px', color: ['deposit', 'roi', 'salary'].includes(txn.type) ? 'var(--success)' : 'var(--danger)' }}>
                        {['deposit', 'roi', 'salary'].includes(txn.type) ? '+' : '-'}{formatCurrency(txn.amount)}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>الرصيد: {formatCurrency(txn.balance_after)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== TOPUP TAB — BANKILY ===================== */}
      {activeTab === 'topup' && (
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          {/* Company Bankily Number — PROMINENT */}
          <div style={{
            padding: '20px', borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, #009944 0%, #00b359 100%)',
            color: '#fff', textAlign: 'center', marginBottom: '20px',
            boxShadow: '0 4px 20px rgba(0,153,68,0.3)',
          }}>
            <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '6px' }}>📱 قم بالتحويل إلى رقم بنكيلي الخاص بالشركة</div>
            <div style={{
              fontSize: '32px', fontWeight: 900, letterSpacing: '4px',
              fontFamily: 'monospace', textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}>
              {BANKILY_NUMBER}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '8px' }}>
              احتفظ بلقطة الشاشة وإشعار التحويل لإرفاقه بالطلب
            </div>
          </div>

          {/* Deposit Form */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">⬆️ طلب شحن المحفظة</h2>
            </div>
            <form onSubmit={handleTopup} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 20px 20px' }}>

              {/* Amount */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 800 }}>المبلغ (MRU) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  placeholder="أدخل المبلغ المراد شحنه..."
                  required
                  min="1"
                  style={{ fontSize: '16px', padding: '12px', fontWeight: 700 }}
                />
              </div>

              {/* Sender Name */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 800 }}>اسم صاحب الحساب المرسِل *</label>
                <input
                  type="text"
                  className="form-input"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  placeholder="الاسم الكامل كما هو في حساب بنكيلي..."
                  required
                  style={{ fontSize: '14px', padding: '12px' }}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  الاسم الذي قام بالتحويل من تطبيقه
                </div>
              </div>

              {/* Screenshot Upload */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 800 }}>لقطة شاشة إشعار التحويل *</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%', padding: '20px', borderRadius: 'var(--radius-md)',
                    border: screenshotPreview ? '2px solid var(--success)' : '2px dashed var(--border-accent)',
                    background: screenshotPreview ? 'rgba(39,174,96,0.05)' : 'var(--bg-secondary)',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                  }}
                >
                  {screenshotPreview ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <div style={{ fontSize: '20px' }}>✅</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--success)' }}>تم رفع الصورة بنجاح — اضغط للتغيير</div>
                      <img src={screenshotPreview} alt="Screenshot" style={{ maxHeight: '120px', borderRadius: 'var(--radius-sm)', objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '32px' }}>📸</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>اضغط لرفع لقطة الشاشة</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>الكاميرا أو الاستوديو — PNG/JPG — حد أقصى 5MB</div>
                    </div>
                  )}
                </button>
              </div>

              {/* Transaction ID — 19 digits */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 800 }}>الرقم التسلسلي للمعاملة (Transaction ID) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={bankilyTxnId}
                  onChange={e => validateTxnId(e.target.value.replace(/\D/g, '').slice(0, 19))}
                  placeholder="أدخل الرقم التسلسلي المكون من 19 رقماً..."
                  required
                  maxLength={19}
                  inputMode="numeric"
                  pattern="\d{19}"
                  style={{
                    fontSize: '16px', padding: '12px', fontFamily: 'monospace', letterSpacing: '2px',
                    border: txnIdError ? '2px solid var(--danger)' : bankilyTxnId.length === 19 ? '2px solid var(--success)' : undefined,
                  }}
                />
                {txnIdError && (
                  <div style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: 700, marginTop: '6px', padding: '6px 10px', background: 'rgba(192,57,43,0.08)', borderRadius: 'var(--radius-sm)' }}>
                    ⚠️ {txnIdError}
                  </div>
                )}
                {bankilyTxnId.length === 19 && !txnIdError && (
                  <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 700, marginTop: '6px' }}>
                    ✅ الرقم التسلسلي صحيح — 19 رقماً
                  </div>
                )}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  مكتوب في إشعار التحويل بنكيلي — 19 رقماً بالضبط
                </div>
              </div>

              {/* Notes (optional) */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">ملاحظات إضافية (اختياري)</label>
                <input
                  type="text"
                  className="form-input"
                  value={topupNotes}
                  onChange={e => setTopupNotes(e.target.value)}
                  placeholder="أي ملاحظات إضافية..."
                  style={{ fontSize: '13px' }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!isFormValid() || submitting}
                style={{
                  width: '100%', padding: '14px', fontSize: '16px', fontWeight: 800,
                  opacity: (!isFormValid() || submitting) ? 0.5 : 1,
                }}
              >
                {submitting ? '⏳ جاري الإرسال...' : '📤 إرسال طلب الشحن'}
              </button>

              {/* Validation Summary */}
              {!isFormValid() && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  {!topupAmount && '• أدخل المبلغ\n'}
                  {!senderName.trim() && '• أدخل اسم صاحب الحساب\n'}
                  {!screenshotPreview && '• ارفع لقطة شاشة\n'}
                  {bankilyTxnId.length !== 19 && '• الرقم التسلسلي يجب أن يكون 19 رقماً\n'}
                </div>
              )}
            </form>
          </div>

          {/* My Requests */}
          {topupRequests.length > 0 && (
            <div className="card" style={{ marginTop: '16px' }}>
              <div className="card-header">
                <h2 className="card-title">طلبات الشحن ({topupRequests.length})</h2>
              </div>
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
                      {req.sender_name && <>المرسِل: {req.sender_name} | </>}
                      {req.bankily_txn_id && <>رقم المعاملة: {req.bankily_txn_id} | </>}
                      {new Date(req.created_at).toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

              {/* Amount */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 800 }}>المبلغ المطلوب سحبه (MRU) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder="0"
                  required
                  min="1"
                  max={wallet?.balance || 0}
                  style={{ fontSize: '16px', fontWeight: 700 }}
                />
              </div>

              {/* Payment Method */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 800 }}>وسيلة السحب *</label>
                <select
                  className="form-input"
                  value={withdrawMethod}
                  onChange={e => {
                    setWithdrawMethod(e.target.value);
                    setWithdrawAccount('');
                  }}
                  required
                  style={{ fontSize: '14px' }}
                >
                  <option value="">اختر وسيلة السحب...</option>
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Account Details — dynamic placeholder */}
              {withdrawMethod && (
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 800 }}>
                    {PAYMENT_METHODS.find(m => m.value === withdrawMethod)?.label} — بيانات الحساب *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={withdrawAccount}
                    onChange={e => setWithdrawAccount(e.target.value)}
                    placeholder={PAYMENT_METHODS.find(m => m.value === withdrawMethod)?.placeholder || 'أدخل بيانات الحساب...'}
                    required
                    style={{ fontSize: '14px' }}
                  />
                </div>
              )}

              {/* Notes (optional) */}
              <div className="form-group">
                <label className="form-label">ملاحظات إضافية (اختياري)</label>
                <input type="text" className="form-input" value={withdrawNotes} onChange={e => setWithdrawNotes(e.target.value)} placeholder="أي ملاحظات إضافية..." style={{ fontSize: '13px' }} />
              </div>

              {/* Live Fee Calculation */}
              {withdrawFeeInfo && (
                <div style={{
                  padding: '14px', borderRadius: 'var(--radius-md)',
                  background: withdrawFeeInfo.fee > 0 ? 'rgba(243,156,18,0.08)' : 'rgba(39,174,96,0.08)',
                  border: `1px solid ${withdrawFeeInfo.fee > 0 ? 'rgba(243,156,18,0.3)' : 'rgba(39,174,96,0.3)'}`,
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                    حساب العمولة — {withdrawFeeInfo.tier}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div style={{ padding: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ color: 'var(--text-muted)' }}>المبلغ المطلوب</div>
                      <div style={{ fontWeight: 800 }}>{formatCurrency(Number(withdrawAmount))} MRU</div>
                    </div>
                    <div style={{ padding: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ color: 'var(--text-muted)' }}>عمولة السحب ({withdrawFeeInfo.feePercent * 100}%)</div>
                      <div style={{ fontWeight: 800, color: 'var(--danger)' }}>-{formatCurrency(withdrawFeeInfo.fee)} MRU</div>
                    </div>
                    <div style={{ padding: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', gridColumn: '1 / -1' }}>
                      <div style={{ color: 'var(--text-muted)' }}>المبلغ الذي سيصلك فعلياً</div>
                      <div style={{ fontWeight: 900, fontSize: '16px', color: 'var(--success)' }}>{formatCurrency(withdrawFeeInfo.netAmount)} MRU</div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-danger"
                disabled={submitting || !withdrawMethod || !withdrawAccount || !withdrawAmount}
                style={{
                  alignSelf: 'flex-start',
                  opacity: (submitting || !withdrawMethod || !withdrawAccount || !withdrawAmount) ? 0.5 : 1,
                }}
              >
                {submitting ? '⏳ جاري...' : withdrawFeeInfo ? `💸 سحب ${formatCurrency(withdrawFeeInfo.netAmount)} MRU` : '💸 سحب المبلغ'}
              </button>
            </form>
          </div>
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
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(txn.created_at).toLocaleDateString('ar-SA')}</div>
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

      {/* ===================== ADMIN TAB (FM only) ===================== */}
      {activeTab === 'admin' && isFM && (
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h2 className="card-title">🔧 طلبات الشحن المعلقة ({adminPending.length})</h2>
            </div>
            {adminPending.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد طلبات معلقة</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                {adminPending.map(req => (
                  <div key={req.request_id} style={{
                    padding: '20px', borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-secondary)', border: '2px solid var(--border-warning)',
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '15px' }}>طلب #{req.request_id}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>المستخدم: #{req.user_id}</div>
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '22px', color: 'var(--success)' }}>{formatCurrency(req.amount)} MRU</div>
                    </div>

                    {/* Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px', fontSize: '12px' }}>
                      <div style={{ padding: '8px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>اسم المرسِل</div>
                        <div style={{ fontWeight: 700 }}>{req.sender_name || '—'}</div>
                      </div>
                      <div style={{ padding: '8px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>رقم المعاملة</div>
                        <div style={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: '1px' }}>{req.bankily_txn_id || '—'}</div>
                      </div>
                      <div style={{ padding: '8px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>طريقة الدفع</div>
                        <div style={{ fontWeight: 700 }}>بنكيلي</div>
                      </div>
                      <div style={{ padding: '8px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>التاريخ</div>
                        <div style={{ fontWeight: 700 }}>{new Date(req.created_at).toLocaleDateString('ar-SA')}</div>
                      </div>
                    </div>

                    {/* Screenshot */}
                    {req.proof_url && (
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>لقطة الشاشة:</div>
                        <a href={req.proof_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={req.proof_url}
                            alt="Screenshot"
                            style={{ maxHeight: '200px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', cursor: 'pointer' }}
                          />
                        </a>
                      </div>
                    )}

                    {req.notes && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', padding: '8px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                        ملاحظات: {req.notes}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        className="btn btn-sm"
                        style={{ background: 'var(--success)', color: '#fff', borderColor: 'var(--success)', flex: 1, padding: '10px' }}
                        onClick={() => handleAdminAction(req.request_id, 'approve')}
                      >
                        ✅ تأكيد وشحن الرصيد
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ flex: 1, padding: '10px' }}
                        onClick={() => handleAdminAction(req.request_id, 'reject')}
                      >
                        ❌ رفض الطلب
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
                      <th>المرسِل</th>
                      <th>رقم المعاملة</th>
                      <th>المبلغ</th>
                      <th>التاريخ</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminAll.map(req => (
                      <tr key={req.request_id}>
                        <td>{req.request_id}</td>
                        <td>#{req.user_id}</td>
                        <td style={{ fontSize: '12px' }}>{req.sender_name || '—'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{req.bankily_txn_id || '—'}</td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(req.amount)}</td>
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
