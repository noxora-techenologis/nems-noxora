'use client';

import { useEffect, useState } from 'react';
import { formatCurrency as formatCurrencyImport, formatNumber } from '@/lib/format';
import CandlestickChart from '@/components/CandlestickChart';
import { getSession, getAuthHeaders } from '@/lib/auth';
import UserProfileModal from '@/components/UserProfileModal';

const COLORS = ['#C0392B', '#F39C12', '#3498DB', '#9B59B6', '#1ABC9C'];

export default function OwnersModule({ session }) {
  const [owners, setOwners] = useState([]);
  const [shares, setShares] = useState([]);
  const [votes, setVotes] = useState([]);
  const [voteOptions, setVoteOptions] = useState([]);
  const [userVotes, setUserVotes] = useState([]);
  const [shareTransactions, setShareTransactions] = useState([]);
  const [positionRequests, setPositionRequests] = useState([]);
  const [activeRoles, setActiveRoles] = useState(['OWNER']);
  const [allPositions, setAllPositions] = useState([]);
  const [valuation, setValuation] = useState(null);
  const [profitInfo, setProfitInfo] = useState(null);
  const [distributions, setDistributions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('shares'); // shares, transactions, positions, votes, new-vote, withdrawals
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

  // Withdrawal form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('تحويل بنكي');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [showOwnerProfile, setShowOwnerProfile] = useState(false);

  const isOwner = session.role_name.toLowerCase() === 'owner' || session.role_name.toLowerCase() === 'ceo';
  const isCEO = session.role_name.toLowerCase() === 'ceo';
  const isFM = session.role_name.toLowerCase() === 'fm';
  const canManage = isCEO || isFM;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ownRes, shrRes, vtRes, optRes, uVtRes, txnRes, posRes, valRes, profRes, distRes, wdRes, roleRes] = await Promise.all([
        fetch('/api/data/owners', { headers: getAuthHeaders() }),
        fetch('/api/data/shares', { headers: getAuthHeaders() }),
        fetch('/api/data/votes', { headers: getAuthHeaders() }),
        fetch('/api/data/vote_options', { headers: getAuthHeaders() }),
        fetch('/api/data/user_votes', { headers: getAuthHeaders() }),
        fetch('/api/data/share_transactions', { headers: getAuthHeaders() }),
        fetch('/api/data/position_requests', { headers: getAuthHeaders() }),
        fetch('/api/data/company_valuation', { headers: getAuthHeaders() }),
        fetch('/api/valuation', { headers: getAuthHeaders() }),
        fetch('/api/data/profit_distributions', { headers: getAuthHeaders() }),
        fetch(`/api/withdrawals?ownerId=${session.owner_id || ''}&role=${session.role_name || ''}`, { headers: getAuthHeaders() }),
        fetch(`/api/owner-roles?ownerId=${session.owner_id || ''}`, { headers: getAuthHeaders() }),
      ]);
      const ownData = await ownRes.json();
      const shrData = await shrRes.json();
      const vtData = await vtRes.json();
      const optData = await optRes.json();
      const uVtData = await uVtRes.json();
      const txnData = await txnRes.json();
      const posData = await posRes.json();
      const valData = await valRes.json();
      const profData = await profRes.json();
      const distData = await distRes.json();
      const wdData = await wdRes.json();
      const roleData = await roleRes.json();

      setOwners(ownData.data || []);
      setShares(shrData.data || []);
      setVotes(vtData.data || []);
      setVoteOptions(optData.data || []);
      setUserVotes(uVtData.data || []);
      setShareTransactions(txnData.data || []);
      setPositionRequests(posData.data || []);
      setDistributions(distData.data || []);
      setWithdrawals(wdData.data || []);
      setProfitInfo(profData || null);
      setActiveRoles(roleData.active_roles || ['OWNER']);
      setAllPositions(roleData.positions || []);
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

  // === Withdrawal handlers ===
  const handleCreateWithdrawal = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || Number(withdrawAmount) <= 0) return;
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          owner_id: session.owner_id,
          amount: Number(withdrawAmount),
          payment_method: withdrawMethod,
          notes: withdrawNotes,
          _userId: session.user_id,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert('تم إرسال طلب السحب بنجاح! في انتظار المراجعة المالية.');
        setWithdrawAmount('');
        setWithdrawMethod('تحويل بنكي');
        setWithdrawNotes('');
        fetchData();
      } else {
        alert(result.error || 'فشلت عملية الإرسال');
      }
    } catch (err) {
      console.error(err);
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleUpdateWithdrawalStatus = async (requestId, newStatus) => {
    const labels = { FINANCIALLY_VERIFIED: 'التدقيق المالي', APPROVED: 'الاعتماد النهائي', COMPLETED: 'تأكيد التحويل' };
    if (!confirm(`هل تريد تغيير الحالة إلى "${labels[newStatus]}"؟`)) return;
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          _id: requestId,
          status: newStatus,
          role: session.role_name,
          user_id: session.user_id,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert('تم تحديث الحالة بنجاح!');
        fetchData();
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch (err) {
      console.error(err);
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleCancelWithdrawal = async (requestId) => {
    if (!confirm('هل تريد إلغاء هذا الطلب؟')) return;
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ _id: requestId, role: session.role_name, user_id: session.user_id }),
      });
      const result = await res.json();
      if (result.success) {
        alert('تم الإلغاء');
        setSelectedWithdrawal(null);
        fetchData();
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch (err) {
      console.error(err);
      alert('تعذر الاتصال بالخادم');
    }
  };

  const withdrawStatusLabel = (s) => {
    const map = { PENDING: 'جديد', FINANCIALLY_VERIFIED: 'قيد المراجعة المالية', APPROVED: 'معتمد', COMPLETED: 'تم التحويل' };
    return map[s] || s;
  };
  const withdrawStatusColor = (s) => {
    const map = { PENDING: 'var(--info)', FINANCIALLY_VERIFIED: 'var(--warning)', APPROVED: 'var(--success)', COMPLETED: 'var(--text-muted)' };
    return map[s] || 'var(--text-muted)';
  };

  const myOwner = owners.find(o => o.user_id === session.user_id);
  const myDists = distributions.filter(d => d.owner_id === (myOwner?.owner_id));
  const totalDistributed = myDists.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const totalWithdrawn = withdrawals
    .filter(w => w.status === 'COMPLETED' || w.status === 'APPROVED')
    .reduce((s, w) => s + (Number(w.amount) || 0), 0);
  const availableBalance = totalDistributed - totalWithdrawn;

  const handleCreateVote = async (e) => {
    e.preventDefault();
    if (!voteTitle || !voteDesc) return;

    try {
      // 1. Create main vote
      const voteRes = await fetch('/api/data/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
        if (optToUpdate && totalShares > 0) {
          const prevWeightedVotes = (optToUpdate.weighted_percentage / 100) * totalShares;
          const newWeightedVotes = prevWeightedVotes + sharesWeight;
          const nextWeight = Math.min(100, Math.round((newWeightedVotes / totalShares) * 10000) / 100);
          await fetch('/api/data/vote_options', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({
              _id: optionId,
              _userId: session.user_id,
              votes_count: optToUpdate.votes_count + 1,
              weighted_percentage: isNaN(nextWeight) ? 0 : nextWeight,
            }),
          });
        }

        alert('تم تسجيل صوتك ووزنك الاستثماري بنجاح!');
        fetchData();
      } else {
        alert(voteResult.error || 'فشلت عملية التصويت');
      }
    } catch (err) {
      console.error(err);
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
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
    } catch (err) {
      console.error(err);
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleApproveShareTxn = async (txnId, approved) => {
    try {
      const res = await fetch('/api/share-transactions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          transactionId: txnId,
          approved,
        })
      });
      const result = await res.json();
      if (result.success) {
        alert(approved ? 'تم اعتماد المعاملة بنجاح وتحديث هيكل الأسهم!' : 'تم رفض المعاملة.');
        fetchData();
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch (err) {
      console.error(err);
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
      const res = await fetch('/api/owner-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          owner_id: currentOwner.owner_id,
          position_code: reqRole,
          reason: reqReason,
          user_id: session.user_id,
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
    } catch (err) {
      console.error(err);
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleApprovePositionRequest = async (reqId, approved, ownerId, roleName) => {
    try {
      const res = await fetch('/api/owner-roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          request_id: reqId,
          action: approved ? 'approve' : 'reject',
          role: session.role_name,
          user_id: session.user_id,
          owner_id: ownerId,
          position_code: roleName,
        })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message || (approved ? 'تم اعتماد المنصب بنجاح!' : 'تم رفض الطلب.'));
        fetchData();
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch (err) {
      console.error(err);
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleDemotePosition = async (positionCode) => {
    const pos = allPositions.find(p => p.code === positionCode);
    if (!confirm(`هل أنت متأكد من التنازل عن منصب "${pos?.name || positionCode}"؟\nستفقد جميع الصلاحيات المرتبطة بهذا المنصب.`)) return;

    // Use verified owner record from DB, not session data
    const currentOwner = owners.find(o => o.user_id === session.user_id);
    if (!currentOwner) {
      alert('لم يُعثر على سجل ملكيتك.');
      return;
    }

    try {
      const res = await fetch('/api/owner-roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          action: 'demote',
          owner_id: currentOwner.owner_id,
          position_code: positionCode,
        })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message || 'تم التنازل عن المنصب بنجاح.');
        fetchData();
      } else {
        alert(result.error || 'فشلت العملية');
      }
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

  // If user has owner role but no owner record, show clear message
  if (isOwner && !session.owner_id) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🏛️</div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
          حسابك غير مسجل كمالك
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '24px' }}>
          دورك في النظام هو <strong>مالك (Owner)</strong> لكن لا يوجد سجل ملكية مرتبط بحسابك.
          <br />
          يرجى التواصل مع مدير النظام لتسجيل حسابك كمالك في النظام.
        </p>
        <div style={{
          padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-accent)', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right'
        }}>
          <strong>ماذا تحتاج؟</strong>
          <ul style={{ marginTop: '8px', paddingRight: '16px', listStyle: 'disc' }}>
            <li>تسجيل سجل مالك (owner) مرتبط بحسابك</li>
            <li>تخصيص أسهم لك في جدول shares</li>
            <li>تحديث الجلسة (تسجيل الخروج ثم الدخول مرة أخرى)</li>
          </ul>
        </div>
      </div>
    );
  }

  // Format using NEMS unified formatter (enforces Ghubariya numerals and MRU currency)
  const formatCurrency = (n) => formatCurrencyImport(n, 'MRU');

  const totalShares = shares.reduce((s, sh) => s + sh.total_shares, 0) || 0;
  const capital = valuation ? Number(valuation.capital) || 0 : 0;
  const retainedEarnings = valuation ? Number(valuation.retained_earnings) || 0 : 0;
  const companyValue = capital + retainedEarnings;
  const shareValue = totalShares > 0 ? companyValue / totalShares : 0;
  const netProfit = profitInfo ? Number(profitInfo.net_profit) || 0 : 0;
  const pendingToOwners = profitInfo ? Number(profitInfo.pending_to_owners_30) || 0 : 0;
  const pendingToCompany = profitInfo ? Number(profitInfo.pending_to_company_70) || 0 : 0;

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
        {(isOwner || isCEO) && (
          <button
            id="tab-own-withdrawals"
            className={`btn ${activeTab === 'withdrawals' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('withdrawals')}
          >
            💸 سحب الأرباح
          </button>
        )}
      </div>

      {activeTab === 'shares' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">رأس المال والأرباح وتقييم الشركة</h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                رأس المال التأسيسي + الأرباح المحتفظ بها (70%) — التوزيع (30%) للملاك
              </div>
            </div>
            <div className="badge badge-success">إجمالي الأسهم: {formatNumber(totalShares)} سهم</div>
          </div>

          {/* Dynamic Valuation Banner */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px',
            margin: '16px 0', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-accent)'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>رأس المال التأسيسي</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--info)', marginTop: '4px' }}>
                {formatCurrency(capital)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>الأرباح المحتفظ بها (70%)</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--success)', marginTop: '4px' }}>
                {formatCurrency(retainedEarnings)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>إجمالي قيمة الشركة</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--noxora-yellow-light)', marginTop: '4px' }}>
                {formatCurrency(companyValue)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>قيمة السهم الحالية</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--success)', marginTop: '4px' }}>
                {formatCurrency(shareValue)} / سهم
              </div>
            </div>
            {pendingToOwners > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>أرباح للتوزيع (30%)</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--warning)', marginTop: '4px' }}>
                  {formatCurrency(pendingToOwners)}
                </div>
              </div>
            )}
          </div>

          {isCEO && pendingToOwners > 0 && (
            <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--warning)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>توزيع الأرباح المتاحة</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  30% للملاك ({formatCurrency(pendingToOwners)}) | 70% للشركة ({formatCurrency(pendingToCompany)})
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={async () => {
                if (!confirm('هل تريد توزيع الأرباح الآن؟')) return;
                const res = await fetch('/api/valuation', { method: 'POST', headers: getAuthHeaders() });
                const data = await res.json();
                if (data.success) {
                  alert(`تم التوزيع بنجاح!\nأرباح للملاك: ${formatCurrency(data.data.distributed_to_owners)}\nأرباح محتفظ بها: ${formatCurrency(data.data.retained_by_company)}\nقيمة الشركة الجديدة: ${formatCurrency(data.data.new_company_value)}`);
                  fetchData();
                } else {
                  alert(data.error || 'فشلت عملية التوزيع');
                }
              }}>💰 توزيع الأرباح</button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '10px' }}>
            {shares.map((sh, i) => {
              const owner = owners.find(o => o.owner_id === sh.owner_id);
              const cardColor = COLORS[i % COLORS.length];
              const ownerValuation = sh.total_shares * shareValue;
              const ownerDists = distributions.filter(d => d.owner_id === sh.owner_id);
              const totalDistributed = ownerDists.reduce((s, d) => s + (Number(d.amount) || 0), 0);

              return (
                <div key={sh.share_id} style={{
                  padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
                  border: `1px solid ${cardColor}35`, position: 'relative', overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)', transition: 'all var(--transition-base)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <div
                        style={{ fontWeight: 800, fontSize: '15px', cursor: owner?.user_id ? 'pointer' : 'default', textDecoration: owner?.user_id ? 'underline' : 'none' }}
                        onClick={() => {
                          if (owner?.user_id) {
                            setSelectedOwner({ ...owner, role_name: 'Owner' });
                            setShowOwnerProfile(true);
                          }
                        }}
                        title={owner?.user_id ? 'عرض الملف الشخصي' : ''}
                      >{owner?.name || `مساهم ${sh.owner_id}`}</div>
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
                      <span className="text-muted">القيمة الاستثمارية</span>
                      <div style={{ fontWeight: 800, fontSize: '13px', marginTop: '2px' }}>{formatCurrency(ownerValuation)}</div>
                    </div>
                  </div>
                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', borderRight: `3px solid ${cardColor}` }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>إجمالي الأرباح الموزعة (30%)</span>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                      {formatCurrency(totalDistributed)}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Current Active Roles Banner */}
          <div className="card" style={{ border: '2px solid var(--border-accent)' }}>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>🏛️ مناصبي الحالية في الشركة ({activeRoles.length})</h3>
                <span className="badge badge-success">{activeRoles.length} منصب نشط</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {activeRoles.map(role => {
                  const pos = allPositions.find(p => p.code === role);
                  const isOwnerRole = role === 'OWNER';
                  return (
                    <div key={role} style={{
                      padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 800,
                      background: isOwnerRole ? 'rgba(192,57,43,0.08)' : 'rgba(39,174,96,0.08)',
                      border: `1px solid ${isOwnerRole ? 'rgba(192,57,43,0.3)' : 'rgba(39,174,96,0.3)'}`,
                      display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto'
                    }}>
                      <span style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
                        background: isOwnerRole ? 'rgba(192,57,43,0.15)' : 'rgba(39,174,96,0.15)',
                        color: isOwnerRole ? 'var(--danger)' : 'var(--success)',
                      }}>
                        {isOwnerRole ? '👑' : '💼'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: isOwnerRole ? 'var(--danger)' : 'var(--success)', fontSize: '15px' }}>{pos?.name || role}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                          {isOwnerRole ? 'منصب أساسي - لا يمكن التنازل عنه' : 'منصب معتمد'}
                        </div>
                      </div>
                      {!isOwnerRole && (
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ color: 'var(--danger)', borderColor: 'rgba(231,76,60,0.3)', fontSize: '11px', padding: '4px 10px', whiteSpace: 'nowrap' }}
                          onClick={() => handleDemotePosition(role)}
                        >
                          التنازل
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

            {/* Position Requests History */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">📋 سجل طلبات المناصب</h2>
              </div>
              {positionRequests.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  لا توجد طلبات مناصب مسجلة حالياً.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {positionRequests.map(req => {
                    const reqOwner = owners.find(o => o.owner_id === req.owner_id);
                    const pos = allPositions.find(p => p.code === req.position || p.code === req.requested_role_name);
                    return (
                      <div key={req.request_id} style={{
                        padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                        border: `1px solid ${req.status === 'pending' ? 'rgba(243,156,18,0.3)' : req.status === 'approved' ? 'rgba(39,174,96,0.3)' : 'rgba(231,76,60,0.3)'}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '14px' }}>{pos?.name || req.position || req.requested_role_name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              المالك: <strong>{reqOwner?.name || `مالك ${req.owner_id}`}</strong>
                            </div>
                          </div>
                          <span className={`badge ${req.status === 'approved' ? 'badge-success' : req.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                            {req.status === 'approved' ? '✅ معتمد' : req.status === 'pending' ? '⏳ قيد الدراسة' : '❌ مرفوض'}
                          </span>
                        </div>
                        {req.reason && (
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '8px', borderRadius: 'var(--radius-sm)', margin: 0 }}>
                            💬 {req.reason}
                          </p>
                        )}
                        {isCEO && req.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-sm btn-primary" onClick={() => handleApprovePositionRequest(req.request_id, true, req.owner_id, req.position || req.requested_role_name)}>
                              ✅ اعتماد
                            </button>
                            <button className="btn btn-sm btn-secondary" style={{ color: 'var(--danger)', borderColor: 'rgba(231,76,60,0.3)' }} onClick={() => handleApprovePositionRequest(req.request_id, false, req.owner_id, req.position || req.requested_role_name)}>
                              ❌ رفض
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
                <h3 className="card-title">💼 طلب منصب وظيفي جديد</h3>
              </div>
              <form onSubmit={handleCreatePositionRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">المنصب المطلوب</label>
                  <select id="req-role-select" className="form-select" value={reqRole} onChange={e => setReqRole(e.target.value)}>
                    {(() => {
                      const groups = {};
                      allPositions.forEach(p => {
                        if (!groups[p.group]) groups[p.group] = [];
                        groups[p.group].push(p);
                      });
                      return Object.entries(groups).map(([group, positions]) => (
                        <optgroup key={group} label={group}>
                          {positions.map(p => (
                            <option key={p.code} value={p.code} disabled={activeRoles.includes(p.code)}>
                              {p.name} ({p.code}){activeRoles.includes(p.code) ? ' ✅' : ''}
                            </option>
                          ))}
                        </optgroup>
                      ));
                    })()}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">المؤهلات وتبرير الطلب</label>
                  <textarea
                    id="req-reason-input"
                    className="form-textarea"
                    value={reqReason}
                    onChange={e => setReqReason(e.target.value)}
                    placeholder="اكتب خبراتك وما ي justify طلبك لهذا المنصب..."
                    style={{ minHeight: '100px' }}
                    required
                  />
                </div>
                <button id="submit-pos-req-btn" type="submit" className="btn btn-primary w-full">
                  🚀 تقديم طلب المنصب
                </button>
              </form>
            </div>

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

      {/* === WITHDRAWALS TAB === */}
      {activeTab === 'withdrawals' && (
        <div>
          {/* Balance Banner */}
          <div style={{
            padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-accent)', marginBottom: '20px',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>إجمالي الأرباح الموزعة لك</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--success)', marginTop: '4px' }}>{formatCurrency(totalDistributed)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>إجمالي المسحوب</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--danger)', marginTop: '4px' }}>{formatCurrency(totalWithdrawn)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>الرصيد المتاح للسحب</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--noxora-yellow-light)', marginTop: '4px' }}>{formatCurrency(availableBalance)}</div>
            </div>
          </div>

          <div className="grid-cols-2-1">
            {/* Withdrawal List */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">طلبات السحب ({withdrawals.length})</h2>
              </div>
              {withdrawals.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد طلبات سحب</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}>
                  {withdrawals.map(w => {
                    const owner = owners.find(o => o.owner_id === w.owner_id);
                    return (
                      <div
                        key={w.request_id}
                        onClick={() => setSelectedWithdrawal(w)}
                        style={{
                          padding: '14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                          background: selectedWithdrawal?.request_id === w.request_id ? 'var(--bg-card-hover)' : 'var(--bg-secondary)',
                          border: `1px solid ${selectedWithdrawal?.request_id === w.request_id ? 'var(--border-accent)' : 'var(--border-primary)'}`,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{owner?.name || `مالك #${w.owner_id}`}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(w.created_at).toLocaleDateString('ar-SA')}</div>
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--danger)' }}>{formatCurrency(w.amount)}</div>
                            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, color: withdrawStatusColor(w.status), background: `${withdrawStatusColor(w.status)}15` }}>
                              {withdrawStatusLabel(w.status)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Details / Actions */}
            <div>
              {/* Create new withdrawal (Owner only) */}
              {isOwner && availableBalance > 0 && (
                <div className="card" style={{ marginBottom: '16px' }}>
                  <div className="card-header">
                    <h2 className="card-title">💸 طلب سحب جديد</h2>
                  </div>
                  <form onSubmit={handleCreateWithdrawal} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 16px 16px' }}>
                    <div className="form-group">
                      <label className="form-label">المبلغ المطلوب سحبه (MRU) — المتاح: {formatCurrency(availableBalance)}</label>
                      <input type="number" className="form-input" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="0" required min="1" max={availableBalance} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">وسيلة السحب</label>
                      <select className="form-select" value={withdrawMethod} onChange={e => setWithdrawMethod(e.target.value)}>
                        <option value="تحويل بنكي">تحويل بنكي</option>
                        <option value="بنكيلي">بنكيلي</option>
                        <option value="محفظة إلكترونية">محفظة إلكترونية</option>
                        <option value="كاش">كاش</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">ملاحظات</label>
                      <input type="text" className="form-input" value={withdrawNotes} onChange={e => setWithdrawNotes(e.target.value)} placeholder="رقم الحساب أو أي ملاحظات..." />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>إرسال طلب السحب</button>
                  </form>
                </div>
              )}

              {/* Selected withdrawal details */}
              {selectedWithdrawal && (
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">تفاصيل الطلب #{selectedWithdrawal.request_id}</h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 16px 16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <div className="form-label">المبلغ</div>
                        <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--danger)' }}>{formatCurrency(selectedWithdrawal.amount)}</div>
                      </div>
                      <div>
                        <div className="form-label">الحالة</div>
                        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, color: withdrawStatusColor(selectedWithdrawal.status), background: `${withdrawStatusColor(selectedWithdrawal.status)}15` }}>
                          {withdrawStatusLabel(selectedWithdrawal.status)}
                        </span>
                      </div>
                      <div>
                        <div className="form-label">وسيلة السحب</div>
                        <div>{selectedWithdrawal.payment_method}</div>
                      </div>
                      <div>
                        <div className="form-label">تاريخ الطلب</div>
                        <div>{new Date(selectedWithdrawal.created_at).toLocaleDateString('ar-SA')}</div>
                      </div>
                    </div>

                    {selectedWithdrawal.notes && (
                      <div>
                        <div className="form-label">ملاحظات</div>
                        <div style={{ fontSize: '13px' }}>{selectedWithdrawal.notes}</div>
                      </div>
                    )}

                    {/* Workflow Progress */}
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', margin: '8px 0' }}>
                      {['PENDING', 'FINANCIALLY_VERIFIED', 'APPROVED', 'COMPLETED'].map((s, i) => {
                        const statusOrder = ['PENDING', 'FINANCIALLY_VERIFIED', 'APPROVED', 'COMPLETED'];
                        const currentIdx = statusOrder.indexOf(selectedWithdrawal.status);
                        const isActive = i <= currentIdx;
                        return (
                          <div key={s} style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ height: '6px', borderRadius: '3px', background: isActive ? withdrawStatusColor(s) : 'var(--border-primary)', marginBottom: '4px' }} />
                            <div style={{ fontSize: '9px', color: isActive ? withdrawStatusColor(s) : 'var(--text-muted)', fontWeight: isActive ? 700 : 400 }}>
                              {withdrawStatusLabel(s)}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="divider" style={{ margin: '4px 0' }} />

                    {/* Action Buttons based on role */}
                    {isCEO && selectedWithdrawal.status === 'FINANCIALLY_VERIFIED' && (
                      <button className="btn btn-primary" onClick={() => handleUpdateWithdrawalStatus(selectedWithdrawal.request_id, 'APPROVED')}>
                        ✅ اعتماد وموافقة نهائية
                      </button>
                    )}

                    {canManage && selectedWithdrawal.status === 'APPROVED' && (
                      <button className="btn btn-primary" onClick={() => handleUpdateWithdrawalStatus(selectedWithdrawal.request_id, 'COMPLETED')}>
                        💰 تأكيد التحويل للمالك
                      </button>
                    )}

                    {canManage && selectedWithdrawal.status === 'PENDING' && (
                      <button className="btn btn-secondary" onClick={() => handleUpdateWithdrawalStatus(selectedWithdrawal.request_id, 'FINANCIALLY_VERIFIED')}>
                        📋 تدقيق مالي
                      </button>
                    )}

                    {(isOwner && selectedWithdrawal.status === 'PENDING') || (isCEO) ? (
                      <button className="btn btn-danger btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => handleCancelWithdrawal(selectedWithdrawal.request_id)}>
                        🗑️ إلغاء الطلب
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
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

      {/* Owner Profile Modal */}
      {showOwnerProfile && selectedOwner && (
        <UserProfileModal
          user={selectedOwner}
          currentUser={session}
          onClose={() => { setShowOwnerProfile(false); setSelectedOwner(null); }}
          onUpdate={() => fetchData()}
        />
      )}
    </div>
  );
}
