'use client';

import { useEffect, useState } from 'react';
import { formatCurrency as formatCurrencyImport, formatNumber } from '@/lib/format';
import DashboardLayout from '@/components/DashboardLayout';

export default function OwnerDashboard() {
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
      fetch('/api/data/owners').then(r => r.json()),
      fetch('/api/data/shares').then(r => r.json()),
      fetch('/api/data/profit_distributions').then(r => r.json()),
      fetch('/api/data/votes').then(r => r.json()),
      fetch('/api/data/vote_options').then(r => r.json()),
      fetch('/api/data/share_transactions').then(r => r.json()),
    ]).then(([own, shr, dist, vts, vOpts, trans]) => {
      setData({
        owners: own.data || [],
        shares: shr.data || [],
        distributions: dist.data || [],
        votes: vts.data || [],
        voteOptions: vOpts.data || [],
        transactions: trans.data || [],
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div className="animate-spin" style={{ fontSize: '36px' }}>⟳</div>
        <p style={{ color: 'var(--text-secondary)' }}>جاري تحميل بيانات الملاك...</p>
      </div>
    </DashboardLayout>
  );

  const { owners = [], shares = [], distributions = [], votes = [], voteOptions = [] } = data || {};

  // Format using NEMS unified formatter (enforces Ghubariya numerals and MRU currency)
  const formatCurrency = (n) => formatCurrencyImport(n, 'MRU');

  const totalShares = shares.reduce((s, sh) => s + sh.total_shares, 0);
  const totalDistributed = distributions.filter(d => d.payment_status === 'paid').reduce((s, d) => s + d.amount, 0);
  const activeVotes = votes.filter(v => v.status === 'active');

  // Share colors for owners
  const COLORS = ['#C0392B', '#F39C12', '#3498DB', '#8B5CF6', '#27AE60', '#E67E22', '#1ABC9C', '#9B59B6'];

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">لوحة الملاك والمساهمين 🏛️</h1>
          <p className="page-subtitle">الأسهم والتصويت وتوزيع الأرباح</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">🏛️</div>
          <div className="stat-value">{owners.length}</div>
          <div className="stat-label">الملاك والشركاء</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon yellow">📜</div>
          <div className="stat-value">{formatNumber(totalShares)}</div>
          <div className="stat-label">إجمالي الأسهم</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green">💰</div>
          <div className="stat-value" style={{ fontSize: '18px' }}>{formatCurrency(totalDistributed)}</div>
          <div className="stat-label">الأرباح الموزعة</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">🗳️</div>
          <div className="stat-value">{activeVotes.length}</div>
          <div className="stat-label">تصويتات نشطة</div>
        </div>
      </div>

      <div className="grid-cols-2-1">
        {/* Share Distribution */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📊 توزيع ملكية الأسهم</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {shares.map((sh, i) => {
              const owner = owners.find(o => o.owner_id === sh.owner_id);
              return (
                <div key={sh.share_id} style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: `1px solid ${COLORS[i % COLORS.length]}33` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{owner?.name || `مالك ${sh.owner_id}`}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatNumber(sh.total_shares)} سهم</div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: COLORS[i % COLORS.length] }}>{sh.ownership_percentage}%</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>قيمة: {formatCurrency(sh.total_shares * sh.current_value)}</div>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${sh.ownership_percentage}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Active Votes */}
          {activeVotes.length > 0 && (
            <div className="card" style={{ border: '1px solid rgba(192, 57, 43, 0.3)' }}>
              <div className="card-header">
                <h2 className="card-title">🗳️ تصويتات نشطة</h2>
                <span className="badge badge-danger">{activeVotes.length}</span>
              </div>
              {activeVotes.map(v => {
                const options = voteOptions.filter(o => o.vote_id === v.vote_id);
                const totalVotes = options.reduce((s, o) => s + o.votes_count, 0);
                return (
                  <div key={v.vote_id} id={`vote-${v.vote_id}`} style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '4px' }}>{v.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      حتى: {v.end_date?.split(' ')[0]}
                    </div>
                    {options.map(o => (
                      <div key={o.option_id} style={{ marginBottom: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                          <span>{o.option_text}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{o.weighted_percentage}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${o.weighted_percentage}%` }} />
                        </div>
                      </div>
                    ))}
                    <button
                      id={`vote-now-${v.vote_id}`}
                      className="btn btn-primary btn-sm w-full"
                      style={{ marginTop: '10px' }}
                    >
                      🗳️ التصويت الآن
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Profit distributions */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">💰 آخر توزيعات الأرباح</h2>
            </div>
            {distributions.slice(0, 5).map(d => {
              const owner = owners.find(o => o.owner_id === d.owner_id);
              return (
                <div key={d.distribution_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border-primary)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{owner?.name || `مالك ${d.owner_id}`}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.period} · {d.owner_percentage}%</div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '14px' }}>{formatCurrency(d.amount)}</div>
                    <span className={`badge ${d.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
                      {d.payment_status === 'paid' ? 'مصروف' : 'معلق'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
