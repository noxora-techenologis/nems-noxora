'use client';

import { useEffect, useState } from 'react';

const MEETING_TYPES = [
  { key: 'all', label: '📋 الكل', color: 'var(--text-muted)' },
  { key: 'إداري', label: '🏛️ إداري', color: '#C0392B' },
  { key: 'مالك', label: '💼 ملاك', color: '#9B59B6' },
  { key: 'مشروع', label: '📂 مشروع', color: '#3498DB' },
  { key: 'فني', label: '⚙️ فني', color: '#1ABC9C' },
  { key: 'طارئ', label: '🚨 طارئ', color: '#E67E22' },
];

export default function MeetingsModule({ session }) {
  const [meetings, setMeetings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [expandedMeeting, setExpandedMeeting] = useState(null);
  const [editingMinutes, setEditingMinutes] = useState({});

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingType, setMeetingType] = useState('إداري');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('قاعة الاجتماعات الرئيسية / رابط Meet المرفق');
  const [agenda, setAgenda] = useState('');

  const canManage = ['admin', 'ceo', 'pm', 'hr'].includes(session.role_name.toLowerCase());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [meetRes, empRes, projRes] = await Promise.all([
        fetch('/api/data/meetings'),
        fetch('/api/data/employees'),
        fetch('/api/data/projects'),
      ]);
      const meetData = await meetRes.json();
      const empData = await empRes.json();
      const projData = await projRes.json();

      setMeetings(meetData.data || []);
      setEmployees(empData.data || []);
      setProjects(projData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!title || !date || !startTime || !endTime) return;

    try {
      const res = await fetch('/api/data/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          type: meetingType,
          organizer_id: session.employee_id || 'EMP-001',
          project_id: null,
          date,
          start_time: startTime,
          end_time: endTime,
          location,
          agenda,
          minutes: '',
          decisions: '',
          status: 'scheduled',
          _userId: session.user_id,
        }),
      });

      const result = await res.json();
      if (result.success) {
        alert('تم جدولة الاجتماع بنجاح وتعميم الدعوة!');
        setTitle(''); setDescription(''); setDate('');
        setStartTime(''); setEndTime('');
        setAgenda('');
        setShowForm(false);
        fetchData();
      } else {
        alert(result.error || 'فشلت جدولة الاجتماع');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleSaveMinutes = async (meetingId) => {
    const edits = editingMinutes[meetingId] || {};
    try {
      const res = await fetch('/api/data/meetings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: meetingId,
          _userId: session.user_id,
          minutes: edits.minutes ?? '',
          decisions: edits.decisions ?? '',
          status: 'completed',
        })
      });
      const result = await res.json();
      if (result.success) {
        alert('تم حفظ محضر ونتائج الاجتماع بنجاح!');
        setEditingMinutes(prev => { const n = { ...prev }; delete n[meetingId]; return n; });
        fetchData();
      } else {
        alert(result.error || 'فشل الحفظ');
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

  const filteredMeetings = filterType === 'all' ? meetings : meetings.filter(m => m.type === filterType);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📅 الاجتماعات والقرارات المشتركة</h1>
          <p className="page-subtitle">جدولة وتوثيق الجلسات الإدارية والمالية والفنية للشركة مع محاضر القرارات</p>
        </div>
        {canManage && !showForm && (
          <button id="add-meeting-btn" className="btn btn-primary btn-md" onClick={() => setShowForm(true)}>
            📅 جدولة جلسة جديدة
          </button>
        )}
      </div>

      {/* Meeting Type Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {MEETING_TYPES.map(t => (
          <button
            key={t.key}
            id={`filter-${t.key}`}
            className={`btn ${filterType === t.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterType(t.key)}
            style={filterType === t.key ? {} : { color: t.color, borderColor: `${t.color}44` }}
          >
            {t.label}
          </button>
        ))}
        <span style={{ marginRight: 'auto', alignSelf: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          {filteredMeetings.length} اجتماع
        </span>
      </div>

      <div className="grid-cols-2-1">
        {/* Left: list of meetings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredMeetings.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              لا توجد اجتماعات بهذا النوع.
            </div>
          ) : filteredMeetings.map(meet => {
            const organizer = employees.find(e => e.employee_id === meet.organizer_id);
            const typeInfo = MEETING_TYPES.find(t => t.key === meet.type) || MEETING_TYPES[0];
            const isExpanded = expandedMeeting === meet.meeting_id;
            const edits = editingMinutes[meet.meeting_id];
            return (
              <div key={meet.meeting_id} id={`meeting-row-${meet.meeting_id}`} style={{
                padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
                border: `1px solid ${meet.status === 'completed' ? 'rgba(39,174,96,0.2)' : 'var(--border-primary)'}`,
                transition: 'all var(--transition-base)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>{meet.title}</h3>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: typeInfo.color, fontWeight: 700, padding: '2px 8px', background: `${typeInfo.color}18`, borderRadius: '12px' }}>{typeInfo.label}</span>
                    <span className={`badge ${meet.status === 'scheduled' ? 'badge-warning' : meet.status === 'completed' ? 'badge-success' : 'badge-muted'}`} style={{ fontSize: '10px' }}>
                      {meet.status === 'scheduled' ? 'مجدول ⏳' : meet.status === 'completed' ? 'مكتمل ✅' : meet.status}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>{meet.description}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  <div>📅 <strong style={{ color: 'var(--text-primary)' }}>{meet.date}</strong></div>
                  <div>⏰ <strong style={{ color: 'var(--text-primary)' }}>{meet.start_time} - {meet.end_time}</strong></div>
                  <div>📍 <strong style={{ color: 'var(--text-primary)' }}>{meet.location}</strong></div>
                  <div>👤 <strong style={{ color: 'var(--noxora-yellow-light)' }}>{organizer?.job_title || 'إدارة نوكسورا'}</strong></div>
                </div>

                {meet.agenda && (
                  <div style={{ padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', fontSize: '12px', borderRight: '3px solid var(--noxora-red-light)', marginBottom: '12px' }}>
                    <div style={{ fontWeight: 800, marginBottom: '4px', color: 'var(--text-primary)' }}>📋 الأجندة:</div>
                    <div style={{ whiteSpace: 'pre-line', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{meet.agenda}</div>
                  </div>
                )}

                {/* Show minutes/decisions if completed */}
                {meet.status === 'completed' && (meet.minutes || meet.decisions) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    {meet.minutes && (
                      <div style={{ padding: '10px 12px', background: 'rgba(39,174,96,0.08)', borderRadius: 'var(--radius-md)', fontSize: '12px', border: '1px solid rgba(39,174,96,0.2)' }}>
                        <div style={{ fontWeight: 800, marginBottom: '4px', color: 'var(--success)' }}>📝 محضر الاجتماع:</div>
                        <div style={{ whiteSpace: 'pre-line', lineHeight: 1.5 }}>{meet.minutes}</div>
                      </div>
                    )}
                    {meet.decisions && (
                      <div style={{ padding: '10px 12px', background: 'rgba(192,57,43,0.08)', borderRadius: 'var(--radius-md)', fontSize: '12px', border: '1px solid rgba(192,57,43,0.2)' }}>
                        <div style={{ fontWeight: 800, marginBottom: '4px', color: 'var(--noxora-red-light)' }}>🏛️ قرارات الاجتماع:</div>
                        <div style={{ whiteSpace: 'pre-line', lineHeight: 1.5 }}>{meet.decisions}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Minutes editing (can expand) */}
                {canManage && meet.status === 'scheduled' && (
                  <div>
                    <button
                      id={`expand-minutes-${meet.meeting_id}`}
                      className="btn btn-sm btn-secondary"
                      style={{ width: '100%', marginBottom: isExpanded ? '12px' : '0', color: 'var(--text-muted)' }}
                      onClick={() => {
                        setExpandedMeeting(isExpanded ? null : meet.meeting_id);
                        if (!editingMinutes[meet.meeting_id]) {
                          setEditingMinutes(prev => ({ ...prev, [meet.meeting_id]: { minutes: meet.minutes || '', decisions: meet.decisions || '' } }));
                        }
                      }}
                    >
                      {isExpanded ? '▲ إخفاء نموذج المحضر' : '📝 إضافة محضر ونتائج الاجتماع'}
                    </button>
                    {isExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="form-group">
                          <label className="form-label">📝 محضر الاجتماع (ما تم مناقشته)</label>
                          <textarea
                            id={`minutes-input-${meet.meeting_id}`}
                            className="form-textarea"
                            value={edits?.minutes || ''}
                            onChange={e => setEditingMinutes(prev => ({ ...prev, [meet.meeting_id]: { ...prev[meet.meeting_id], minutes: e.target.value } }))}
                            placeholder="اكتب ملخصاً لما دار في الاجتماع..."
                            style={{ minHeight: '80px' }}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">🏛️ القرارات المتخذة</label>
                          <textarea
                            id={`decisions-input-${meet.meeting_id}`}
                            className="form-textarea"
                            value={edits?.decisions || ''}
                            onChange={e => setEditingMinutes(prev => ({ ...prev, [meet.meeting_id]: { ...prev[meet.meeting_id], decisions: e.target.value } }))}
                            placeholder="القرارات الرسمية المتفق عليها خلال الجلسة..."
                            style={{ minHeight: '70px' }}
                          />
                        </div>
                        <button
                          id={`save-minutes-${meet.meeting_id}`}
                          className="btn btn-primary"
                          onClick={() => handleSaveMinutes(meet.meeting_id)}
                        >
                          💾 حفظ المحضر وإغلاق الجلسة
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: form or hint */}
        <div>
          {showForm ? (
            <div className="card" style={{ boxShadow: 'var(--shadow-md)' }}>
              <div className="card-header">
                <h2 className="card-title">📅 جدولة جلسة جديدة</h2>
              </div>
              <form onSubmit={handleCreateMeeting} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">نوع الاجتماع</label>
                  <select id="new-meeting-type" className="form-select" value={meetingType} onChange={e => setMeetingType(e.target.value)}>
                    <option value="إداري">🏛️ اجتماع إداري</option>
                    <option value="مالك">💼 اجتماع الملاك والشركاء</option>
                    <option value="مشروع">📂 اجتماع مشروع</option>
                    <option value="فني">⚙️ اجتماع فني تقني</option>
                    <option value="طارئ">🚨 اجتماع طارئ</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">عنوان الجلسة</label>
                  <input id="new-meeting-title" type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان الجلسة..." required />
                </div>
                <div className="form-group">
                  <label className="form-label">الوصف والهدف</label>
                  <textarea id="new-meeting-desc" className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="الهدف من الاجتماع..." />
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ الانعقاد</label>
                  <input id="new-meeting-date" type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">وقت البداية</label>
                    <input id="new-meeting-start" type="time" className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">وقت النهاية</label>
                    <input id="new-meeting-end" type="time" className="form-input" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">الموقع / رابط اللقاء</label>
                  <input id="new-meeting-loc" type="text" className="form-input" value={location} onChange={e => setLocation(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">الأجندة المقترحة</label>
                  <textarea id="new-meeting-agenda" className="form-textarea" value={agenda} onChange={e => setAgenda(e.target.value)} placeholder="1. المحور الأول&#10;2. المحور الثاني..." />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button id="save-meeting-btn" type="submit" className="btn btn-primary" style={{ flex: 1 }}>حفظ وجدولة اللقاء</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>إلغاء</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>💡</div>
              <p style={{ fontSize: '13px', lineHeight: 1.6 }}>يتم تعميم وتذكير جميع المدعوين بالاجتماعات تلقائياً عبر نظام الإشعارات.<br />بعد انتهاء الجلسة يمكن توثيق المحضر والقرارات مباشرةً من هذه الواجهة.</p>
              {canManage && (
                <button id="add-meeting-btn-2" className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={() => setShowForm(true)}>
                  + جدولة اجتماع
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


