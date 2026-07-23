'use client';

import { useEffect, useState } from 'react';
import { formatCurrency as formatCurrencyImport, formatNumber } from '@/lib/format';

export default function ClientsModule({ session }) {
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [revenues, setRevenues] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  
  // Tab within client details: info, projects, finance, contracts, comms
  const [activeSubTab, setActiveSubTab] = useState('info');

  // Form states for creating a new client
  const [showAddForm, setShowAddForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCountry, setClientCountry] = useState('السعودية');
  const [clientValueScore, setClientValueScore] = useState(80);

  // Form states for adding communication log
  const [commType, setCommType] = useState('call'); // call, email, meeting, other
  const [commNotes, setCommNotes] = useState('');
  const [commDate, setCommDate] = useState('');

  const canManage = ['admin', 'ceo', 'pm', 'fm'].includes(session.role_name.toLowerCase());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientRes, projRes, revRes, fileRes] = await Promise.all([
        fetch('/api/data/clients'),
        fetch('/api/data/projects'),
        fetch('/api/data/revenues'),
        fetch('/api/data/files'),
      ]);
      
      const clientData = await clientRes.json();
      const projData = await projRes.json();
      const revData = await revRes.json();
      const fileData = await fileRes.json();

      setClients(clientData.data || []);
      setProjects(projData.data || []);
      setRevenues(revData.data || []);
      setFiles(fileData.data || []);
      
      // Keep selected client updated if it was selected
      if (selectedClient) {
        const updated = (clientData.data || []).find(c => c.client_id === selectedClient.client_id);
        if (updated) setSelectedClient(updated);
      }
    } catch (err) {
      console.error('Failed to fetch CRM data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!clientName || !clientEmail || !clientPhone || !clientCompany) {
      alert('يرجى تعبئة كافة الحقول الأساسية للعميل');
      return;
    }

    try {
      const res = await fetch('/api/data/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
          company: clientCompany,
          address: clientAddress,
          country: clientCountry,
          value_score: Number(clientValueScore),
          status: 'active',
          communication_log: [],
          _userId: session.user_id
        })
      });

      const result = await res.json();
      if (result.success) {
        alert('تم تسجيل العميل الجديد بنجاح!');
        setClientName('');
        setClientEmail('');
        setClientPhone('');
        setClientCompany('');
        setClientAddress('');
        setClientValueScore(80);
        setShowAddForm(false);
        fetchData();
      } else {
        alert(result.error || 'فشلت إضافة العميل');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleAddCommLog = async (e) => {
    e.preventDefault();
    if (!commNotes || !commDate) {
      alert('يرجى كتابة الملاحظات وتحديد التاريخ');
      return;
    }

    const currentLogs = selectedClient.communication_log || [];
    const newLog = {
      id: currentLogs.length + 1,
      type: commType,
      date: commDate,
      notes: commNotes,
      logged_by: session.name
    };

    const updatedLogs = [newLog, ...currentLogs];

    try {
      const res = await fetch('/api/data/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: selectedClient.client_id,
          communication_log: updatedLogs,
          _userId: session.user_id
        })
      });

      const result = await res.json();
      if (result.success) {
        alert('تم تسجيل تقرير التواصل الجديد!');
        setCommNotes('');
        setCommDate('');
        fetchData();
      } else {
        alert(result.error || 'فشل تحديث سجل التواصل');
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

  // Format currency with MRU default
  const formatCurrency = (n, c = 'MRU') => formatCurrencyImport(n, c);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💼 إدارة وحسابات العملاء (CRM)</h1>
          <p className="page-subtitle">بيانات الاتصال للعملاء، عقود المشاريع، المدفوعات، وسجل تفاعلات التواصل</p>
        </div>
        {canManage && !showAddForm && (
          <button id="add-client-btn" className="btn btn-primary" onClick={() => { setShowAddForm(true); setSelectedClient(null); }}>
            ➕ تسجيل عميل جديد
          </button>
        )}
      </div>

      <div className="grid-cols-2-1">
        {/* Left: Client List / Details Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {selectedClient ? (
            // Client Details View
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-primary)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 className="card-title" style={{ fontSize: '20px', fontWeight: 900 }}>{selectedClient.name}</h2>
                    <span className="badge badge-success">نشط</span>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{selectedClient.company}</span>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedClient(null)}>
                  ⬅️ العودة للقائمة
                </button>
              </div>

              {/* Subtabs within details */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '10px', flexWrap: 'wrap' }}>
                <button className={`btn btn-sm ${activeSubTab === 'info' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('info')}>
                  👤 معلومات الاتصال
                </button>
                <button className={`btn btn-sm ${activeSubTab === 'projects' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('projects')}>
                  📂 المشاريع المربوطة ({projects.filter(p => p.client_id === selectedClient.client_id).length})
                </button>
                <button className={`btn btn-sm ${activeSubTab === 'finance' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('finance')}>
                  💰 الفواتير والدفعات ({revenues.filter(r => r.client_id === selectedClient.client_id).length})
                </button>
                <button className={`btn btn-sm ${activeSubTab === 'contracts' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('contracts')}>
                  📎 العقود والملفات
                </button>
                <button className={`btn btn-sm ${activeSubTab === 'comms' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('comms')}>
                  🗣️ سجل التواصل ({selectedClient.communication_log?.length || 0})
                </button>
              </div>

              {/* Subtab Content Panels */}
              {activeSubTab === 'info' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13.5px' }}>
                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>البريد الإلكتروني</div>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedClient.email}</strong>
                  </div>
                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>رقم الهاتف</div>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedClient.phone}</strong>
                  </div>
                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>الشركة والمنشأة</div>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedClient.company}</strong>
                  </div>
                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>العنوان والبلد</div>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedClient.address} - {selectedClient.country}</strong>
                  </div>
                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', gridColumn: 'span 2' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>قيمة وتصنيف العميل (Value Score)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="progress-bar" style={{ flex: 1, height: '10px' }}>
                        <div className="progress-fill" style={{ width: `${selectedClient.value_score}%`, background: 'var(--grad-red)' }} />
                      </div>
                      <strong style={{ color: 'var(--noxora-yellow-light)' }}>{selectedClient.value_score}%</strong>
                    </div>
                  </div>
                </div>
              )}

              {activeSubTab === 'projects' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {projects.filter(p => p.client_id === selectedClient.client_id).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لا توجد مشاريع مسجلة لهذا العميل حالياً</div>
                  ) : (
                    projects.filter(p => p.client_id === selectedClient.client_id).map(p => (
                      <div key={p.project_id} style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>{p.name}</strong>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>الميزانية المخصصة: {formatCurrency(p.budget, p.currency)}</div>
                        </div>
                        <span className="badge badge-success">{p.progress}% مكتمل</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeSubTab === 'finance' && (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>البند</th>
                        <th>التصنيف</th>
                        <th>المبلغ والعملة</th>
                        <th>التاريخ</th>
                        <th>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenues.filter(r => r.client_id === selectedClient.client_id).length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد معاملات مالية أو دفعات للعميل</td>
                        </tr>
                      ) : (
                        revenues.filter(r => r.client_id === selectedClient.client_id).map(r => (
                          <tr key={r.revenue_id}>
                            <td style={{ fontWeight: 800 }}>{r.title}</td>
                            <td>{r.type}</td>
                            <td style={{ color: 'var(--success)', fontWeight: 800 }}>{formatCurrency(r.amount, r.currency)}</td>
                            <td>{r.date}</td>
                            <td><span className="badge badge-success">تم الاستلام ✓</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeSubTab === 'contracts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {files.filter(f => f.category === 'contract').length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لا توجد عقود مرفوعة حالياً للعميل</div>
                  ) : (
                    files.filter(f => f.category === 'contract').map(f => (
                      <div key={f.file_id} style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>📄 {f.name}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>الحجم: {formatNumber((f.size / 1024).toFixed(0))} KB</div>
                        </div>
                        <a href="#" className="btn btn-secondary btn-sm" onClick={(e) => { e.preventDefault(); alert('تحميل مستند العقد المشفّر...'); }}>📥 تحميل</a>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeSubTab === 'comms' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Comm log form */}
                  {canManage && (
                    <form onSubmit={handleAddCommLog} style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h4 style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--noxora-yellow-light)' }}>💬 تسجيل تفاعل تواصل جديد</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '11px' }}>نوع التواصل</label>
                          <select className="form-select" style={{ padding: '6px' }} value={commType} onChange={e => setCommType(e.target.value)}>
                            <option value="call">📞 اتصال هاتفي</option>
                            <option value="email">✉️ بريد إلكتروني</option>
                            <option value="meeting">🤝 اجتماع عمل</option>
                            <option value="other">💬 آخر</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '11px' }}>تاريخ التواصل</label>
                          <input type="date" className="form-input" style={{ padding: '5px' }} value={commDate} onChange={e => setCommDate(e.target.value)} required />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '11px' }}>ملاحظات وتفاصيل التفاعل</label>
                        <textarea className="form-textarea" style={{ minHeight: '60px', padding: '8px' }} value={commNotes} onChange={e => setCommNotes(e.target.value)} placeholder="اكتب ما تم نقاشه أو الاتفاق عليه..." required />
                      </div>
                      <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>💾 حفظ التفاعل</button>
                    </form>
                  )}

                  {/* Comm log list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(!selectedClient.communication_log || selectedClient.communication_log.length === 0) ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لا توجد سجلات تواصل مسجلة للعميل</div>
                    ) : (
                      selectedClient.communication_log.map(log => (
                        <div key={log.id} style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', borderRight: '3px solid var(--noxora-yellow-light)', position: 'relative' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                            <span>{log.type === 'call' ? '📞 مكالمة هاتفية' : log.type === 'email' ? '✉️ بريد إلكتروني' : log.type === 'meeting' ? '🤝 اجتماع عمل' : '💬 تواصل'}</span>
                            <span>📅 {log.date}</span>
                          </div>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{log.notes}</p>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'left' }}>بواسطة: {log.logged_by || 'نظام نوكسورا'}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Clients table overview
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">قائمة العملاء وشركاء الأعمال ({clients.length})</h2>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>الاسم والمنشأة</th>
                      <th>البريد الإلكتروني</th>
                      <th>رقم الهاتف</th>
                      <th>الدولة</th>
                      <th>درجة التقييم</th>
                      <th>الخيارات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map(c => (
                      <tr key={c.client_id} id={`client-row-${c.client_id}`} style={{ cursor: 'pointer' }} onClick={() => setSelectedClient(c)}>
                        <td>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{c.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.company}</div>
                        </td>
                        <td>{c.email}</td>
                        <td style={{ fontFamily: 'monospace' }}>{c.phone}</td>
                        <td>{c.country}</td>
                        <td>
                          <span className="badge badge-success" style={{ background: c.value_score >= 80 ? 'rgba(39, 174, 96, 0.2)' : 'rgba(243, 156, 18, 0.2)', color: c.value_score >= 80 ? 'var(--success)' : 'var(--noxora-yellow-light)' }}>
                            {c.value_score}%
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedClient(c); }}>
                            🔍 تفاصيل
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Creation Form or statistics */}
        <div>
          {showAddForm ? (
            <div className="card" style={{ boxShadow: 'var(--shadow-md)' }}>
              <div className="card-header">
                <h2 className="card-title">➕ تسجيل عميل جديد في نوكسورا</h2>
              </div>
              <form onSubmit={handleAddClient} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">الاسم الكامل للعميل</label>
                  <input id="new-client-name" type="text" className="form-input" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="الاسم الشخصي للمسؤول..." required />
                </div>
                <div className="form-group">
                  <label className="form-label">المنشأة / الشركة</label>
                  <input id="new-client-company" type="text" className="form-input" value={clientCompany} onChange={e => setClientCompany(e.target.value)} placeholder="اسم المؤسسة أو الشركة..." required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">البريد الإلكتروني</label>
                    <input id="new-client-email" type="email" className="form-input" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="name@company.com" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">رقم الاتصال</label>
                    <input id="new-client-phone" type="text" className="form-input" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="05xxxxxxxx" required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">العنوان الجغرافي بالكامل</label>
                  <input id="new-client-address" type="text" className="form-input" value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="المدينة، الشارع، المبنى..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">البلد</label>
                    <input id="new-client-country" type="text" className="form-input" value={clientCountry} onChange={e => setClientCountry(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">تقييم الأهمية (Value Score)</label>
                    <input id="new-client-value" type="number" min="0" max="100" className="form-input" value={clientValueScore} onChange={e => setClientValueScore(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button id="save-client-btn" type="submit" className="btn btn-primary" style={{ flex: 1 }}>💾 حفظ وتأكيد البيانات</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>إلغاء</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 className="card-title">💡 لوحة أعمال العملاء</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                يتم ربط كل عميل بمشاريع نوكسورا تكنولوجيز مباشرة، لمتابعة العقود، وحساب الدفعات المالية المودعة في الخزينة تلقائياً.
              </p>
              <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', borderRight: '3px solid var(--noxora-yellow-light)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>إجمالي عدد عملاء Noxora</span>
                <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', marginTop: '4px' }}>{clients.length} عميل</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
