'use client';

import { useEffect, useState } from 'react';
import { formatCurrency as formatCurrencyImport, formatNumber } from '@/lib/format';
import CandlestickChart from '@/components/CandlestickChart';

const COLORS = ['#C0392B', '#F39C12', '#3498DB', '#9B59B6', '#1ABC9C'];

export default function OwnersModule({ session }) {
  const [owners, setOwners] = useState([]);
  const [shares, setShares] = useState([]);
  const [votes, setVotes] = useState([]);
  const [voteOptions, setVoteOptions] = useState([]);
  const [userVotes, setUserVotes] = useState([]);
  const [shareTransactions, setShareTransactions] = useState([]);
  const [positionRequests, setPositionRequests] = useState([]);
  const [valuation, setValuation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('shares'); // shares, transactions, positions, votes, new-vote
  const [, setCurrTick] = useState(0);

  useEffect(() => {
    const handleCurrChange = () => setCurrTick(t => t + 1);
    window.addEventListener('currency-change', handleCurrChange);
    return () => window.removeEventListener('currency-change', handleCurrChange);
  }, []);

  // New vote form state
  const [voteTitle, setVoteTitle] = useState('');
  const [voteDesc, setVoteDesc] = useState('');
  const [voteOptionsText, setVoteOptionsText] = useState('الموافقة على القرار والبنود الكاملة\nالرفض وطلب التعديل وإعادة الصياغة\nالتحفظ عن التصويت');

  // Share transaction form
  const [txnType, setTxnType] = useState('transfer');
  const [txnToOwnerId, setTxnToOwnerId] = useState('');
  const [txnShares, setTxnShares] = useState('');
  const [txnPrice, setTxnPrice] = useState('');
  const [txnNotes, setTxnNotes] = useState('');

  // Position request form
  const [reqRole, setReqRole] = useState('PM');
  const [reqReason, setReqReason] = useState('');

  // Valuation edit form
  const [editAssets, setEditAssets] = useState('');
  const [editLiabilities, setEditLiabilities] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showValuationForm, setShowValuationForm] = useState(false);

  const isOwner = session.role_name.toLowerCase() === 'owner' || session.role_name.toLowerCase() === 'ceo';
  const isCEO = session.role_name.toLowerCase() === 'ceo';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ownRes, shrRes, vtRes, optRes, uVtRes, txnRes, posRes, valRes] = await Promise.all([
        fetch('/api/data/owners'),
        fetch('/api/data/shares'),
        fetch('/api/data/votes'),
        fetch('/api/data/vote_options'),
        fetch('/api/data/user_votes'),
        fetch('/api/data/share_transactions'),
        fetch('/api/data/position_requests'),
        fetch('/api/data/company_valuation'),
      ]);
      const ownData = await ownRes.json();
      const shrData = await shrRes.json();
      const vtData = await vtRes.json();
      const optData = await optRes.json();
      const uVtData = await uVtRes.json();
      const txnData = await txnRes.json();
      const posData = await posRes.json();
      const valData = await valRes.json();

      setOwners(ownData.data || []);
      setShares(shrData.data || []);
      setVotes(vtData.data || []);
      setVoteOptions(optData.data || []);
      setUserVotes(uVtData.data || []);
      setShareTransactions(txnData.data || []);
      setPositionRequests(posData.data || []);
      const val = (valData.data || [])[0] || null;
      setValuation(val);
      if (val) {
        setEditAssets(String(val.total_assets || ''));
        setEditLiabilities(String(val.total_liabilities || ''));
        setEditNotes(val.notes || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVote = async (e) => {
    e.preventDefault();
    if (!voteTitle || !voteDesc) return;

    try {
      // 1. Create main vote
      const voteRes = await fetch('/api/data/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: voteTitle,
          description: voteDesc,
          type: 'capital',
          created_by: session.user_id,
          start_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19),
          status: 'active',
          weight_by_shares: true,
          winner_option_id: null,
          _userId: session.user_id,
        }),
      });

      const voteResult = await voteRes.json();
      if (!voteResult.success) {
        alert(voteResult.error || 'فشلت عملية إنشاء التصويت');
        return;
      }

      const createdVote = voteResult.data;

      // 2. Create Options
      const optionsArr = voteOptionsText.split('\n').filter(o => o.trim() !== '');
      for (const optText of optionsArr) {
        await fetch('/api/data/vote_options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vote_id: createdVote.vote_id,
            option_text: optText.trim(),
            votes_count: 0,
            weighted_percentage: 0,
            _userId: session.user_id,
          }),
        });
      }

      alert('تم إطلاق قرار التصويت بنجاح وتعميمه على الملاك!');
      setVoteTitle('');
      setVoteDesc('');
      setActiveTab('votes');
      fetchData();

    } catch (err) {
      console.error(err);
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleCastVote = async (voteId, optionId) => {
    // Check if already voted
    const alreadyVoted = userVotes.some(uv => uv.vote_id === voteId && uv.user_id === session.user_id);
    if (alreadyVoted) {
      alert('لقد قمت بالتصويت على هذا القرار مسبقاً ولا يمكن التعديل.');
      return;
    }

    // Get owner shares weight
    const ownerInfo = owners.find(o => o.user_id === session.user_id);
    const ownerShares = shares.find(s => s.owner_id === ownerInfo?.owner_id);
    const sharesWeight = ownerShares ? ownerShares.total_shares : 100; // fallback weight

    try {
      // 1. Record user vote
      const voteRes = await fetch('/api/data/user_votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote_id: voteId,
          user_id: session.user_id,
          option_id: optionId,
          shares_weight: sharesWeight,
          _userId: session.user_id,
        }),
      });

      const voteResult = await voteRes.json();
      if (voteResult.success) {
        // Update vote_option counter locally (normally this would recalculate in backend, but we'll sync local state via DB update)
        const optToUpdate = voteOptions.find(o => o.option_id === optionId);
        if (optToUpdate) {
          const totalShares = shares.reduce((s, sh) => s + sh.total_shares, 0);
          const nextWeight = parseFloat((((optToUpdate.votes_count * optToUpdate.weighted_percentage * totalShares / 100) + sharesWeight) / totalShares * 100).toFixed(2));
          await fetch('/api/data/vote_options', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              _id: optionId,
              _userId: session.user_id,
              votes_count: optToUpdate.votes_count + 1,
              weighted_percentage: isNaN(nextWeight) ? 10 : nextWeight,
            }),
          });
        }

        alert('تم تسجيل صوتك ووزنك الاستثماري بنجاح!');
        fetchData();
      } else {
        alert(voteResult.error || 'فشلت عملية التصويت');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleShareTransaction = async (e) => {
    e.preventDefault();
    if (!txnShares || Number(txnShares) <= 0) {
      alert('يرجى تحديد عدد الأسهم');
      return;
    }
    const currentOwner = owners.find(o => o.user_id === session.user_id);
    if (!currentOwner) {
      alert('لم يُعثر على سجل ملكيتك. تأكد أنك مسجل كمالك في النظام.');
      return;
    }

    const myShares = shares.find(s => s.owner_id === currentOwner.owner_id);
    if (!myShares || Number(txnShares) > myShares.total_shares) {
      alert(`لا تملك عدداً كافياً من الأسهم. أسهمك المتاحة: ${myShares?.total_shares || 0}`);
      return;
    }

    try {
      const res = await fetch('/api/data/share_transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_owner_id: currentOwner.owner_id,
          to_owner_id: txnType !== 'sell' ? Number(txnToOwnerId) : null,
          shares_count: Number(txnShares),
          transaction_type: txnType,
          price_per_share: Number(txnPrice) || 0,
          total_value: Number(txnShares) * (Number(txnPrice) || 0),
          status: 'pending',
          notes: txnNotes,
          _userId: session.user_id
        })
      });
      const result = await res.json();
      if (result.success) {
        alert('تم تقديم طلب المعاملة بنجاح! في انتظار موافقة المدير العام.');
        setTxnShares('');
        setTxnPrice('');
        setTxnNotes('');
        fetchData();
      } else {
        alert(result.error || 'فشل تقديم الطلب');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleApproveShareTxn = async (txnId, approved) => {
    try {
      const res = await fetch('/api/data/share_transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: txnId,
          _userId: session.user_id,
          status: approved ? 'completed' : 'rejected',
          approved_by: session.user_id,
          approved_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
        })
      });
      const result = await res.json();
      if (result.success) {
        alert(approved ? 'تم اعتماد المعاملة بنجاح وتحديث هيكل الأسهم!' : 'تم رفض المعاملة.');
        fetchData();
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleCreatePositionRequest = async (e) => {
    e.preventDefault();
    if (!reqReason.trim()) {
      alert('يرجى كتابة المؤهلات وتبرير طلب المنصب الوظيفي');
      return;
    }
    const currentOwner = owners.find(o => o.user_id === session.user_id);
    if (!currentOwner) {
      alert('لم يُعثر على سجل ملكيتك.');
      return;
    }

    try {
      const res = await fetch('/api/data/position_requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: currentOwner.owner_id,
          user_id: session.user_id,
          requested_role_name: reqRole,
          reason: reqReason,
          status: 'pending',
          _userId: session.user_id,
        })
      });
      const result = await res.json();
      if (result.success) {
        alert('تم رفع طلب المنصب الوظيفي بنجاح إلى المدير العام (CEO)!');
        setReqReason('');
        fetchData();
      } else {
        alert(result.error || 'فشل تقديم الطلب');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleUpdateValuation = async (e) => {
    e.preventDefault();
    if (!isCEO) return;
    try {
      const res = await fetch('/api/data/company_valuation', {
        method: valuation ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valuation ? {
          _id: valuation.valuation_id,
          _userId: session.user_id,
          total_assets: Number(editAssets) || 0,
          total_liabilities: Number(editLiabilities) || 0,
          notes: editNotes,
          updated_by: session.user_id,
        } : {
          total_assets: Number(editAssets) || 0,
          total_liabilities: Number(editLiabilities) || 0,
          notes: editNotes,
          updated_by: session.user_id,
          _userId: session.user_id,
        })
      });
      const result = await res.json();
      if (result.success) {
        alert('تم تحديث تقييم أصول الشركة بنجاح!');
        setShowValuationForm(false);
        fetchData();
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleApprovePositionRequest = async (reqId, approved, ownerId, roleName) => {
    try {
      // 1. Update position_requests status
      const res = await fetch('/api/data/position_requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: reqId,
          _userId: session.user_id,
          status: approved ? 'approved' : 'rejected',
          approved_by: session.user_id,
          approved_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
        })
      });
      const result = await res.json();
      if (result.success) {
        if (approved) {
          // 2. Update secondary_role_name in owners table
          await fetch('/api/data/owners', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              _id: ownerId,
              _userId: session.user_id,
              secondary_role_name: roleName
            })
          });
          alert(`✅ تم اعتماد المنصب (${roleName}) للمالك بنجاح! ستُدمج الصلاحيات تلقائياً عند تسجيل دخوله القادم.`);
        } else {
          alert('❌ تم رفض طلب المنصب الوظيفي.');
        }
        fetchData();
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

  // Format using NEMS unified formatter (enforces Ghubariya numerals and MRU currency)
  const formatCurrency = (n) => formatCurrencyImport(n, 'MRU');

  const totalShares = shares.reduce((s, sh) => s + sh.total_shares, 0);
  const totalAssets = valuation ? Number(valuation.total_assets) : 2250000;
  const totalLiabilities = valuation ? Number(valuation.total_liabilities) : 150000;
  const netValuation = totalAssets - totalLiabilities;
  const shareValue = totalShares > 0 ? netValuation / totalShares : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏛️ شؤون الملاك وحوكمة الشركاء</h1>
          <p className="page-subtitle">نظام هيكلة الأسهم، التصويت الموزون للشركاء، وإطلاق قرارات مجلس الإدارة</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px' }}>
        <button
          id="tab-own-shares"
          className={`btn ${activeTab === 'shares' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('shares')}
        >
          📊 هيكل الحصص والملكية
        </button>
        {isOwner && (
          <button
            id="tab-own-transactions"
            className={`btn ${activeTab === 'transactions' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('transactions')}
          >
            🔄 معاملات الأسهم
          </button>
        )}
        {isOwner && (
          <button
            id="tab-own-positions"
            className={`btn ${activeTab === 'positions' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('positions')}
          >
            💼 المناصب والربط الوظيفي
          </button>
        )}
        <button
          id="tab-own-votes"
          className={`btn ${activeTab === 'votes' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('votes')}
        >
          🗳️ التصويتات والقرارات
        </button>
        {isOwner && (
          <button
            id="tab-own-newvote"
            className={`btn ${activeTab === 'new-vote' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('new-vote')}
          >
            ➕ طرح مبادرة للتصويت
          </button>
        )}
      </div>

      {activeTab === 'shares' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">توزيع الحصص وتقييم أصول الشركة</h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                رأس المال الأولي التأسيسي + صافي الأرباح والإيرادات المشغّلة تلقائياً
              </div>
            </div>
            <div className="badge badge-success">إجمالي الأسهم الحالية: {formatNumber(totalShares)} سهم</div>
          </div>

          {/* Dynamic Valuation Banner */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px',
            margin: '16px 0', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-accent)'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>التقييم الإجمالي لممتلكات وأصول الشركة</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--noxora-yellow-light)', marginTop: '4px' }}>
                {formatCurrency(netValuation)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>قيمة السهم الحالية</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--success)', marginTop: '4px' }}>
                {formatCurrency(shareValue)} / سهم
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>صافي الأصول (أصول - التزامات)</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--info)', marginTop: '4px' }}>
                {formatCurrency(totalAssets)} - {formatCurrency(totalLiabilities)}
              </div>
            </div>
            {isCEO && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => setShowValuationForm(!showValuationForm)}
                >
                  {showValuationForm ? 'إلغاء' : 'تعديل التقييم'}
                </button>
              </div>
            )}
          </div>

          {/* Valuation Edit Form (CEO only) */}
          {showValuationForm && isCEO && (
            <form onSubmit={handleUpdateValuation} style={{
              padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-accent)', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>تعديل تقييم أصول الشركة</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">إجمالي الأصول</label>
                  <input type="number" className="form-input" value={editAssets} onChange={e => setEditAssets(e.target.value)} placeholder="0" required />
                </div>
                <div className="form-group">
                  <label className="form-label">إجمالي الالتزامات</label>
                  <input type="number" className="form-input" value={editLiabilities} onChange={e => setEditLiabilities(e.target.value)} placeholder="0" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">ملاحظات</label>
                <input type="text" className="form-input" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="ملاحظات التقييم..." />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>حفظ التقييم</button>
            </form>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '10px' }}>
            {shares.map((sh, i) => {
              const owner = owners.find(o => o.owner_id === sh.owner_id);
              const cardColor = COLORS[i % COLORS.length];
              const ownerValuation = sh.total_shares * shareValue;

              return (
                <div key={sh.share_id} style={{
                  padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
                  border: `1px solid ${cardColor}35`, position: 'relative', overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)', transition: 'all var(--transition-base)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '15px' }}>{owner?.name || `مساهم ${sh.owner_id}`}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>تاريخ التسجيل: {owner?.join_date}</div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '28px', fontWeight: 900, color: cardColor }}>{sh.ownership_percentage}%</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '16px' }}>
                    <div>
                      <span className="text-muted">الأسهم المملوكة</span>
                      <div style={{ fontWeight: 800, fontSize: '13px', marginTop: '2px' }}>{formatNumber(sh.total_shares)} سهم</div>
                    </div>
                    <div>
                      <span className="text-muted">القيمة الاستثمارية الحالية</span>
                      <div style={{ fontWeight: 800, fontSize: '13px', marginTop: '2px' }}>{formatCurrency(ownerValuation)}</div>
                    </div>
                  </div>
                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', borderRight: '3px solid var(--noxora-red)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>القيمة الاستثمارية لهذا المالك</span>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                      {formatCurrency(ownerValuation)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* TradingView Candlestick Chart */}
          <div style={{ marginTop: '24px' }}>
            <CandlestickChart />
          </div>
        </div>
      )}

      {activeTab === 'transactions' && isOwner && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          
          {/* Transactions List */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">سجل معاملات الأسهم والتحويلات</h2>
            </div>
            {shareTransactions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                لا توجد معاملات مسجلة حتى الآن.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {shareTransactions.map(txn => {
                  const fromOwner = owners.find(o => o.owner_id === txn.from_owner_id);
                  const toOwner = owners.find(o => o.owner_id === txn.to_owner_id);
                  const typeLabels = { transfer: '🔄 تحويل', sell: '💸 بيع', gift: '🎁 هبة' };
                  return (
                    <div key={txn.transaction_id} id={`txn-row-${txn.transaction_id}`} style={{
                      padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                      border: `1px solid ${txn.status === 'pending' ? 'rgba(243,156,18,0.3)' : txn.status === 'completed' ? 'rgba(39,174,96,0.3)' : 'var(--border-primary)'}`,
                      display: 'flex', flexDirection: 'column', gap: '10px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '14px' }}>{typeLabels[txn.transaction_type] || txn.transaction_type}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                            من: {fromOwner?.name || `مالك ${txn.from_owner_id}`}
                            {toOwner ? ` ← إلى: ${toOwner?.name}` : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 900, fontSize: '15px', color: 'var(--noxora-yellow-light)' }}>{formatNumber(txn.shares_count)} سهم</div>
                          {txn.total_value > 0 && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatCurrency(txn.total_value)}</div>}
                        </div>
                      </div>
                      {txn.notes && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{txn.notes}</div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className={`badge ${txn.status === 'completed' ? 'badge-success' : txn.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                          {txn.status === 'completed' ? '✅ مكتملة' : txn.status === 'pending' ? '⏳ معلقة' : '❌ مرفوضة'}
                        </span>
                        {isCEO && txn.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              id={`approve-txn-${txn.transaction_id}`}
                              className="btn btn-sm btn-primary"
                              onClick={() => handleApproveShareTxn(txn.transaction_id, true)}
                            >✅ اعتماد</button>
                            <button
                              id={`reject-txn-${txn.transaction_id}`}
                              className="btn btn-sm btn-secondary"
                              style={{ color: 'var(--danger)', borderColor: 'rgba(231,76,60,0.3)' }}
                              onClick={() => handleApproveShareTxn(txn.transaction_id, false)}
                            >❌ رفض</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* New Transaction Form */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div className="card-header">
              <h3 className="card-title">🔄 طلب معاملة جديدة</h3>
            </div>
            <form onSubmit={handleShareTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">نوع المعاملة</label>
                <select id="txn-type" className="form-select" value={txnType} onChange={e => setTxnType(e.target.value)}>
                  <option value="transfer">🔄 تحويل أسهم للمالك</option>
                  <option value="sell">💸 بيع أسهم</option>
                  <option value="gift">🎁 هبة أسهم</option>
                </select>
              </div>
              {txnType !== 'sell' && (
                <div className="form-group">
                  <label className="form-label">المالك المستلم</label>
                  <select id="txn-to-owner" className="form-select" value={txnToOwnerId} onChange={e => setTxnToOwnerId(e.target.value)}>
                    <option value="">— اختر المالك المستلم —</option>
                    {owners.filter(o => o.user_id !== session.user_id).map(o => (
                      <option key={o.owner_id} value={o.owner_id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">عدد الأسهم</label>
                <input id="txn-shares" type="number" className="form-input" value={txnShares} onChange={e => setTxnShares(e.target.value)} placeholder="0" required />
              </div>
              {txnType === 'sell' && (
                <div className="form-group">
                  <label className="form-label">سعر السهم (MRU)</label>
                  <input id="txn-price" type="number" className="form-input" value={txnPrice} onChange={e => setTxnPrice(e.target.value)} placeholder="0.00" />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">ملاحظات وتبرير الطلب</label>
                <textarea id="txn-notes" className="form-textarea" value={txnNotes} onChange={e => setTxnNotes(e.target.value)} placeholder="اذكر سبب وتفاصيل المعاملة..." style={{ minHeight: '70px' }} />
              </div>
              <button id="submit-txn-btn" type="submit" className="btn btn-primary w-full">
                🚀 تقديم طلب المعاملة
              </button>
            </form>
          </div>

        </div>
      )}

      {activeTab === 'positions' && isOwner && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          
          {/* Requests & Approved Positions List */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">💼 المناصب الوظيفية والاعتمادات للملاك</h2>
            </div>
            
            {/* Owner's Current Role Badge */}
            {(() => {
              const myOwnerObj = owners.find(o => o.user_id === session.user_id);
              return (
                <div style={{
                  padding: '16px', marginBottom: '20px', background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border-accent)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>صفة ملكيتك في الشركة</div>
                    <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', marginTop: '2px' }}>
                      🏛️ مالك وشريك {myOwnerObj?.secondary_role_name ? `+ 💼 ${myOwnerObj.secondary_role_name}` : ''}
                    </div>
                  </div>
                  <span className={`badge ${myOwnerObj?.secondary_role_name ? 'badge-success' : 'badge-warning'}`}>
                    {myOwnerObj?.secondary_role_name ? `منصب وظيفي معتمد: ${myOwnerObj.secondary_role_name}` : 'مالك فقط (بدون منصب وظيفي)'}
                  </span>
                </div>
              );
            })()}

            <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '14px', color: 'var(--text-secondary)' }}>سجل طلبات المناصب الوظيفية:</h3>

            {positionRequests.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                لا توجد طلبات مناصب وظيفية مسجلة حالياً.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {positionRequests.map(req => {
                  const reqOwner = owners.find(o => o.owner_id === req.owner_id);
                  const roleLabels = {
                    PM: '📂 مدير مشروع وتطوير',
                    FM: '💰 مدير مالي (CFO)',
                    HR: '👥 مدير موارد بشرية',
                    CEO: '🏛️ مدير عام (CEO)',
                    CREATOR: '🎬 صانع محتوى ومدير شبكات التواصل',
                    Employee: '⚙️ موظف تشغيلي'
                  };
                  return (
                    <div key={req.request_id} id={`pos-req-row-${req.request_id}`} style={{
                      padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                      border: `1px solid ${req.status === 'pending' ? 'rgba(243,156,18,0.3)' : req.status === 'approved' ? 'rgba(39,174,96,0.3)' : 'var(--border-primary)'}`,
                      display: 'flex', flexDirection: 'column', gap: '10px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '15px' }}>{roleLabels[req.requested_role_name] || req.requested_role_name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            المالك الطالب: <strong style={{ color: 'var(--text-primary)' }}>{reqOwner?.name || `مالك ${req.owner_id}`}</strong>
                          </div>
                        </div>
                        <span className={`badge ${req.status === 'approved' ? 'badge-success' : req.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                          {req.status === 'approved' ? '✅ معتمد' : req.status === 'pending' ? '⏳ قيد الدراسة' : '❌ مرفوض'}
                        </span>
                      </div>

                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '10px', borderRadius: 'var(--radius-sm)', margin: 0 }}>
                        💬 <strong>المؤهلات والتبرير:</strong> {req.reason}
                      </p>

                      {/* CEO Approvals */}
                      {isCEO && req.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', justifyContent: 'flex-end' }}>
                          <button
                            id={`approve-pos-${req.request_id}`}
                            className="btn btn-sm btn-primary"
                            onClick={() => handleApprovePositionRequest(req.request_id, true, req.owner_id, req.requested_role_name)}
                          >
                            ✅ اعتماد المنصب ودمج الصلاحيات
                          </button>
                          <button
                            id={`reject-pos-${req.request_id}`}
                            className="btn btn-sm btn-secondary"
                            style={{ color: 'var(--danger)', borderColor: 'rgba(231,76,60,0.3)' }}
                            onClick={() => handleApprovePositionRequest(req.request_id, false, req.owner_id, req.requested_role_name)}
                          >
                            ❌ رفض الطلب
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* New Request Form */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div className="card-header">
              <h3 className="card-title">💼 طلب منصب وظيفي بالشركة</h3>
            </div>
            <form onSubmit={handleCreatePositionRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">المنصب الوظيفي المطلوب</label>
                <select id="req-role-select" className="form-select" value={reqRole} onChange={e => setReqRole(e.target.value)}>
                  <option value="PM">📂 مدير مشروع (PM)</option>
                  <option value="CREATOR">🎬 صانع محتوى ومدير شبكات التواصل (YouTube & TikTok)</option>
                  <option value="FM">💰 مدير مالي (FM)</option>
                  <option value="HR">👥 مدير موارد بشرية (HR)</option>
                  <option value="Employee">⚙️ موظف متخصص (Employee)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">خبراتك وتبرير طلب المنصب</label>
                <textarea
                  id="req-reason-input"
                  className="form-textarea"
                  value={reqReason}
                  onChange={e => setReqReason(e.target.value)}
                  placeholder="مثال: لدي خبرة 5 سنوات في إدارة شبكات التواصل وصناعة فيديوهات يوتيوب وتيك توك بيتا وأود توجيه هذا القسم..."
                  style={{ minHeight: '110px' }}
                  required
                />
              </div>
              <button id="submit-pos-req-btn" type="submit" className="btn btn-primary w-full">
                🚀 تقديم طلب المنصب للـ CEO
              </button>
            </form>
          </div>

        </div>
      )}

      {activeTab === 'votes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {votes.map(v => {
            const options = voteOptions.filter(o => o.vote_id === v.vote_id);
            const userVotedOpt = userVotes.find(uv => uv.vote_id === v.vote_id && uv.user_id === session.user_id);

            return (
              <div key={v.vote_id} id={`vote-block-${v.vote_id}`} className="card" style={{ border: v.status === 'active' ? '1px solid rgba(192, 57, 43, 0.25)' : '' }}>
                <div className="card-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 900 }}>{v.title}</h3>
                      <span className={`badge ${v.status === 'active' ? 'badge-danger' : 'badge-muted'}`}>
                        {v.status === 'active' ? 'نشط ومستمر للتصويت' : 'مغلق ومؤرشف'}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>الموعد النهائي: {v.end_date}</p>
                  </div>
                </div>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>{v.description}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {options.map(o => {
                    const isMyChoice = userVotedOpt?.option_id === o.option_id;
                    return (
                      <div key={o.option_id} style={{
                        padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                        border: isMyChoice ? '1px solid var(--noxora-red-light)' : '1px solid var(--border-primary)',
                        display: 'flex', alignItems: 'center', gap: '16px', transition: 'all var(--transition-fast)'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                            <span style={{ fontWeight: isMyChoice ? 800 : 600, color: isMyChoice ? 'var(--noxora-red-light)' : 'var(--text-primary)' }}>
                              {o.option_text} {isMyChoice && '⭐ (اختيارك المعتمد)'}
                            </span>
                            <span style={{ fontWeight: 800 }}>{o.weighted_percentage}%</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${o.weighted_percentage}%`, background: isMyChoice ? 'var(--grad-red)' : '' }} />
                          </div>
                        </div>
                        {v.status === 'active' && !userVotedOpt && isOwner && (
                          <button
                            id={`cast-vote-${o.option_id}`}
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleCastVote(v.vote_id, o.option_id)}
                            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                          >
                            🗳️ تأكيد الصوت
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'new-vote' && isOwner && (
        <div className="card" style={{ maxWidth: '640px', margin: '0 auto', boxShadow: 'var(--shadow-md)' }}>
          <div className="card-header">
            <h2 className="card-title">طرح قرار رسمي للتصويت الاستثماري</h2>
          </div>
          <form onSubmit={handleCreateVote} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">مسمى المبادرة / القرار</label>
              <input
                id="new-vote-title"
                type="text"
                className="form-input"
                value={voteTitle}
                onChange={e => setVoteTitle(e.target.value)}
                placeholder="مثال: زيادة ميزانية البحث والتطوير 2027..."
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">تفاصيل القرار والبنود التشريعية</label>
              <textarea
                id="new-vote-desc"
                className="form-textarea"
                value={voteDesc}
                onChange={e => setVoteDesc(e.target.value)}
                placeholder="يرجى كتابة نص المبادرة والشروط الكاملة التي سيقوم الشركاء بالتصويت للمصادقة عليها بناء على نسب الملكية..."
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">خيارات الرد والتصويت (خيار واحد في كل سطر)</label>
              <textarea
                id="new-vote-options"
                className="form-textarea"
                value={voteOptionsText}
                onChange={e => setVoteOptionsText(e.target.value)}
                required
                style={{ minHeight: '120px' }}
              />
            </div>
            <button id="submit-vote-btn" type="submit" className="btn btn-primary w-full" style={{ marginTop: '8px' }}>
              🚀 إطلاق عملية الحوكمة وتعميم القرار
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
