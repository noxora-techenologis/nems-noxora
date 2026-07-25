'use client';

import { useEffect, useState } from 'react';
import { formatCurrency as formatCurrencyImport } from '@/lib/format';
import { calcDepositFee, calcWithdrawalFee } from '@/lib/fees';
import { getSession, getAuthHeaders } from '@/lib/auth';

const TOPUP_STATUS = {
  pending: { label: 'قيد المراجعة', color: 'var(--warning)' },
  approved: { label: 'تم الشحن', color: 'var(--success)' },
  rejected: { label: 'مرفوض', color: 'var(--danger)' },
};

const WITHDRAW_STATUS = {
  PENDING: { label: 'معلق', color: 'var(--warning)' },
  FINANCIALLY_VERIFIED: { label: 'تم التدقيق', color: 'var(--info)' },
  APPROVED: { label: 'معتمد', color: 'var(--success)' },
  COMPLETED: { label: 'مكتمل', color: 'var(--success)' },
  REJECTED: { label: 'مرفوض', color: 'var(--danger)' },
};

export default function WalletAdminModule({ session }) {
  const [adminPending, setAdminPending] = useState([]);
  const [adminAll, setAdminAll] = useState([]);
  const [withdrawPending, setWithdrawPending] = useState([]);
  const [withdrawAll, setWithdrawAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('topup');
  const [, setCurrTick] = useState(0);

  useEffect(() => {
    const handleCurrChange = () => setCurrTick(t => t + 1);
    window.addEventListener('currency-change', handleCurrChange);
    return () => window.removeEventListener('currency-change', handleCurrChange);
  }, []);

  const formatCurrency = (n) => formatCurrencyImport(n, 'MRU');
  const role = session.role_name?.toLowerCase() || '';
  const isShippingAgent = role === 'shipping_agent' || role === 'shipping';
  const isFM = role === 'fm';

  const canManage = isShippingAgent || isFM;

  useEffect(() => {
    if (canManage) fetchData();
  }, [canManage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [topupRes, wdRes] = await Promise.all([
        fetch('/api/wallet/admin', { headers: getAuthHeaders() }),
        fetch('/api/withdrawals?role=all', { headers: getAuthHeaders() }),
      ]);
      const topupData = await topupRes.json();
      const wdData = await wdRes.json();

      setAdminPending(topupData.pending || []);
      setAdminAll(topupData.all || []);
      setWithdrawPending((wdData.data || []).filter(w => w.status === 'PENDING'));
      setWithdrawAll(wdData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTopupAction = async (requestId, action) => {
    try {
      const res = await fetch('/api/wallet/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ request_id: requestId, action, approved_by: session.user_id }),
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        fetchData();
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleWithdrawAction = async (requestId, action) => {
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ request_id: requestId, action, approved_by: session.user_id }),
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        fetchData();
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  if (!canManage) {
    return (
      <div className="card text-center" style={{ padding: '40px', margin: '40px auto', maxWidth: '500px' }}>
        <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🚫</span>
        <h2 style={{ color: 'var(--danger)', marginBottom: '8px' }}>غير مصرح بالوصول</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>هذه الصفحة متاحة لوكيل الشحن والمدير المالي فقط.</p>
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🔧 إدارة الشحن والسحب</h1>
          <p className="page-subtitle">
            {isShippingAgent ? 'وكيل الشحن — مراجعة واعتماد طلبات الشحن والسحب' : 'المدير المالي — مراجعة واعتماد طلبات الشحن والسحب'}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--warning)' }}>
          <div className="stat-value" style={{ fontSize: '22px', color: 'var(--warning)' }}>{adminPending.length}</div>
          <div className="stat-label">طلبات شحن معلقة</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--success)' }}>
          <div className="stat-value" style={{ fontSize: '22px', color: 'var(--success)' }}>{adminAll.filter(t => t.status === 'approved').length}</div>
          <div className="stat-label">شحن مؤكد</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--info)' }}>
          <div className="stat-value" style={{ fontSize: '22px', color: 'var(--info)' }}>{withdrawPending.length}</div>
          <div className="stat-label">طلبات سحب معلقة</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--danger)' }}>
          <div className="stat-value" style={{ fontSize: '22px', color: 'var(--danger)' }}>{adminAll.filter(t => t.status === 'rejected').length}</div>
          <div className="stat-label">مرفوض</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px' }}>
        <button className={`btn ${activeTab === 'topup' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('topup')}>
          ⬆️ طلبات الشحن ({adminPending.length})
        </button>
        <button className={`btn ${activeTab === 'withdraw' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('withdraw')}>
          ⬇️ طلبات السحب ({withdrawPending.length})
        </button>
        <button className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('history')}>
          📋 السجل
        </button>
      </div>

      {/* Top-Up Requests Tab */}
      {activeTab === 'topup' && (
        <div>
          {adminPending.length === 0 ? (
            <div className="card text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>✅ لا توجد طلبات شحن معلقة</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {adminPending.map(req => {
                const feeInfo = calcDepositFee(Number(req.amount));
                return (
                  <div key={req.request_id} className="card" style={{ padding: '20px', border: '2px solid var(--border-warning)' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '15px' }}>طلب شحن #{req.request_id}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>المستخدم: #{req.user_id}</div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 900, fontSize: '22px', color: 'var(--success)' }}>{formatCurrency(req.amount)} MRU</div>
                        {feeInfo.fee > 0 && (
                          <div style={{ fontSize: '11px', color: 'var(--warning)', fontWeight: 700 }}>
                            عمولة: {formatCurrency(feeInfo.fee)} | صافي الشحن: {formatCurrency(feeInfo.creditedAmount)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px', fontSize: '12px' }}>
                      <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>اسم المرسِل</div>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{req.sender_name || '—'}</div>
                      </div>
                      <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>رقم المعاملة (19 رقم)</div>
                        <div style={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: '1px', fontSize: '13px' }}>{req.bankily_txn_id || '—'}</div>
                      </div>
                      <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>العمولة ({feeInfo.tier})</div>
                        <div style={{ fontWeight: 700, color: feeInfo.fee > 0 ? 'var(--warning)' : 'var(--success)' }}>
                          {feeInfo.fee > 0 ? `${formatCurrency(feeInfo.fee)} MRU` : 'بدون عمولة'}
                        </div>
                      </div>
                      <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>التاريخ</div>
                        <div style={{ fontWeight: 700 }}>{new Date(req.created_at).toLocaleDateString('ar-SA')}</div>
                      </div>
                    </div>

                    {/* Screenshot */}
                    {req.proof_url && (
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>لقطة الشاشة:</div>
                        <a href={req.proof_url} target="_blank" rel="noopener noreferrer">
                          <img src={req.proof_url} alt="Screenshot" style={{ maxHeight: '200px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', cursor: 'pointer' }} />
                        </a>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', borderColor: 'var(--success)', flex: 1, padding: '12px', fontSize: '14px', fontWeight: 700 }} onClick={() => handleTopupAction(req.request_id, 'approve')}>
                        ✅ تأكيد وشحن {formatCurrency(feeInfo.creditedAmount)} MRU
                      </button>
                      <button className="btn btn-danger btn-sm" style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: 700 }} onClick={() => handleTopupAction(req.request_id, 'reject')}>
                        ❌ رفض الطلب
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Withdrawal Requests Tab */}
      {activeTab === 'withdraw' && (
        <div>
          {withdrawPending.length === 0 ? (
            <div className="card text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>✅ لا توجد طلبات سحب معلقة</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {withdrawPending.map(wd => {
                const feeInfo = calcWithdrawalFee(Number(wd.amount));
                return (
                  <div key={wd.request_id} className="card" style={{ padding: '20px', border: '2px solid var(--border-info)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '15px' }}>طلب سحب #{wd.request_id}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>المالك: #{wd.owner_id}</div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 900, fontSize: '22px', color: 'var(--danger)' }}>{formatCurrency(wd.amount)} MRU</div>
                        <div style={{ fontSize: '11px', color: 'var(--warning)', fontWeight: 700 }}>
                          عمولة: {formatCurrency(feeInfo.fee)} | صافي الوصول: {formatCurrency(feeInfo.netAmount)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px', fontSize: '12px' }}>
                      <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>وسيلة السحب</div>
                        <div style={{ fontWeight: 700 }}>{wd.payment_method || '—'}</div>
                      </div>
                      <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>الحالة</div>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, color: WITHDRAW_STATUS[wd.status]?.color || 'var(--text-muted)', background: `${WITHDRAW_STATUS[wd.status]?.color || 'var(--text-muted)'}15` }}>
                          {WITHDRAW_STATUS[wd.status]?.label || wd.status}
                        </span>
                      </div>
                    </div>

                    {wd.notes && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', padding: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>ملاحظات: {wd.notes}</div>}

                    {/* Actions based on status */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {wd.status === 'PENDING' && (
                        <button className="btn btn-sm" style={{ background: 'var(--info)', color: '#fff', borderColor: 'var(--info)', flex: 1, padding: '10px' }} onClick={() => handleWithdrawAction(wd.request_id, 'FINANCIALLY_VERIFIED')}>
                          📋 تدقيق مالي
                        </button>
                      )}
                      {wd.status === 'FINANCIALLY_VERIFIED' && (
                        <button className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', borderColor: 'var(--success)', flex: 1, padding: '10px' }} onClick={() => handleWithdrawAction(wd.request_id, 'APPROVED')}>
                          ✅ اعتماد وموافقة
                        </button>
                      )}
                      {wd.status === 'APPROVED' && (
                        <button className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', borderColor: 'var(--success)', flex: 1, padding: '10px' }} onClick={() => handleWithdrawAction(wd.request_id, 'COMPLETED')}>
                          💰 تأكيد التحويل
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">سجل جميع الطلبات</h2>
          </div>
          {adminAll.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد سجلات</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>النوع</th>
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
                      <td>شحن</td>
                      <td>#{req.user_id}</td>
                      <td style={{ fontSize: '12px' }}>{req.sender_name || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{req.bankily_txn_id || '—'}</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(req.amount)}</td>
                      <td style={{ fontSize: '12px' }}>{new Date(req.created_at).toLocaleDateString('ar-SA')}</td>
                      <td>
                        <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, color: TOPUP_STATUS[req.status]?.color || 'var(--text-muted)', background: `${TOPUP_STATUS[req.status]?.color || 'var(--text-muted)'}15` }}>
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
      )}
    </div>
  );
}
