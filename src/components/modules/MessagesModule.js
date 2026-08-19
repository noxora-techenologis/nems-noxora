'use client';

import { useEffect, useState, useRef } from 'react';
import { getAuthHeaders } from '@/lib/auth';

const POLL_INTERVAL = 20000;

export default function MessagesModule({ session }) {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('project_team');
  const [creating, setCreating] = useState(false);
  const msgEndRef = useRef(null);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchSilent, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (msgEndRef.current) {
      msgEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeConv]);

  const applyConversationData = (convData, msgData, preferConvId) => {
    setConversations(convData || []);
    setMessages(msgData || []);
    setActiveConv(prev => {
      if (preferConvId) {
        return convData?.find(c => c.conversation_id === preferConvId) || null;
      }
      if (prev && convData?.some(c => c.conversation_id === prev.conversation_id)) {
        return prev;
      }
      return convData?.[0] || null;
    });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [convRes, msgRes, userRes] = await Promise.all([
        fetch('/api/data/conversations', { headers: getAuthHeaders() }),
        fetch('/api/data/messages', { headers: getAuthHeaders() }),
        fetch('/api/data/users', { headers: getAuthHeaders() }),
      ]);
      const convData = await convRes.json();
      const msgData = await msgRes.json();
      const userData = await userRes.json();

      setUsers(userData.data || []);
      applyConversationData(convData.data || [], msgData.data || [], null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSilent = async () => {
    try {
      const [convRes, msgRes] = await Promise.all([
        fetch('/api/data/conversations', { headers: getAuthHeaders() }),
        fetch('/api/data/messages', { headers: getAuthHeaders() }),
      ]);
      const convData = await convRes.json();
      const msgData = await msgRes.json();
      applyConversationData(convData.data || [], msgData.data || [], null);
      if (activeConv) markRead(activeConv);
    } catch (err) {
      console.error(err);
      // silent background refresh — ignore transient errors
    }
  };

  const markRead = (conv) => {
    if (!conv) return;
    fetch('/api/messages/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ conversation_id: conv.conversation_id }),
        }).catch(err => console.error('Failed to mark as read:', err));
  };

  const openConversation = (c) => {
    setActiveConv(c);
    markRead(c);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeConv || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/data/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          conversation_id: activeConv.conversation_id,
          message_text: text.trim(),
          file_id: null,
          is_read: false,
          status: 'sent',
        }),
      });

      const result = await res.json();
      if (result.success) {
        setText('');
        const [convRes, msgRes] = await Promise.all([
          fetch('/api/data/conversations', { headers: getAuthHeaders() }),
          fetch('/api/data/messages', { headers: getAuthHeaders() }),
        ]);
        const convData = await convRes.json();
        const msgData = await msgRes.json();
        applyConversationData(convData.data || [], msgData.data || [], activeConv.conversation_id);
      } else {
        alert(result.error || 'فشلت عملية الإرسال');
      }
    } catch (err) {
      console.error(err);
      alert('تعذر الاتصال بالخادم');
    } finally {
      setSending(false);
    }
  };

  const handleCreateConversation = async (e) => {
    e.preventDefault();
    if (!newName.trim() || creating) return;

    setCreating(true);
    try {
      const res = await fetch('/api/data/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          name: newName.trim(),
          type: newType,
          created_by: session.user_id,
        }),
      });
      const result = await res.json();
      if (result.success) {
        await fetch('/api/data/conversation_members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            conversation_id: result.data.conversation_id,
            user_id: session.user_id,
            role: 'owner',
          }),
    }).catch(err => console.error('Failed to add member to conversation:', err));
        setNewName('');
        setShowCreate(false);
        const convRes = await fetch('/api/data/conversations', { headers: getAuthHeaders() });
        const convData = await convRes.json();
        setConversations(convData.data || []);
        setActiveConv(result.data);
        markRead(result.data);
      } else {
        alert(result.error || 'فشل إنشاء القناة');
      }
    } catch (err) {
      console.error(err);
      alert('تعذر الاتصال بالخادم');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="animate-spin" style={{ fontSize: '32px' }}>⟳</div>
      </div>
    );
  }

  const lastMessageOf = (convId) =>
    messages.filter(m => m.conversation_id === convId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).at(-1);

  const unreadOf = (convId) =>
    messages.filter(m => m.conversation_id === convId && !m.is_read && m.sender_id !== session.user_id).length;

  const timeOf = (ts) => ts ? ts.split(' ')[1] : '';

  const activeMessages = activeConv
    ? messages.filter(m => m.conversation_id === activeConv.conversation_id)
    : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💬 الرسائل والتواصل الفوري الداخلي</h1>
          <p className="page-subtitle">قنوات دردشة للفرق وغرف للتواصل المباشر مع المسؤولين والملاك</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(v => !v)}>
          {showCreate ? 'إغلاق' : '＋ قناة جديدة'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreateConversation} className="card" style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="اسم القناة (مثال: فريق المبيعات)"
            required
            style={{ flex: 1, minWidth: '200px' }}
          />
          <select className="form-input" value={newType} onChange={e => setNewType(e.target.value)} style={{ width: 'auto' }}>
            <option value="project_team">قناة مشروع/فريق</option>
            <option value="direct">غرفة مباشرة</option>
            <option value="management">قناة الإدارة</option>
          </select>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? 'جاري الإنشاء...' : 'إنشاء'}
          </button>
        </form>
      )}

      <div className="card messages-chat-layout" style={{ padding: 0, height: '72vh', overflow: 'hidden' }}>
        {/* Sidebar: list of chats */}
        <div style={{ borderLeft: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', background: 'rgba(16, 18, 26, 0.4)' }}>
          <div style={{ padding: '20px', fontWeight: 800, borderBottom: '1px solid var(--border-primary)', fontSize: '14.5px', color: 'var(--text-primary)' }}>💬 غرف التواصل المتاحة</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div style={{ padding: '24px 20px', color: 'var(--text-muted)', fontSize: '12.5px', lineHeight: 1.8 }}>
                لا توجد قنوات بعد.<br />أنشئ أول قناة من زر «＋ قناة جديدة»
              </div>
            ) : conversations.map(c => {
              const unread = unreadOf(c.conversation_id);
              const last = lastMessageOf(c.conversation_id);
              return (
                <div
                  key={c.conversation_id}
                  onClick={() => openConversation(c)}
                  style={{
                    padding: '16px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border-primary)',
                    background: activeConv?.conversation_id === c.conversation_id ? 'var(--bg-card-hover)' : '',
                    borderRight: activeConv?.conversation_id === c.conversation_id ? '3px solid var(--noxora-red)' : 'none',
                    transition: 'all var(--transition-fast)'
                  }}
                  id={`chat-channel-${c.conversation_id}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 800, fontSize: '13.5px', color: activeConv?.conversation_id === c.conversation_id ? 'var(--noxora-red-light)' : 'var(--text-primary)' }}>
                      {c.type === 'project_team' ? '📂' : '👤'} {c.name}
                    </div>
                    {unread > 0 && (
                      <span style={{ background: 'var(--noxora-red)', color: '#fff', borderRadius: '50%', minWidth: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, padding: '0 6px' }}>
                        {unread}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {last ? `آخر رسالة: ${timeOf(last.created_at)}` : 'لا رسائل بعد'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat window */}
        {activeConv ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(16, 18, 26, 0.4)' }}>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>{activeConv.name}</div>
              <span className="badge badge-muted" style={{ fontSize: '10.5px' }}>قناة {activeConv.type === 'project_team' ? 'مشروع' : activeConv.type === 'direct' ? 'مباشرة' : 'إدارة'}</span>
            </div>

            {/* Message lists */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activeMessages.length === 0 ? (
                <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '13px' }}>ابدأ المراسلة الآن مع الزملاء...</div>
              ) : (
                activeMessages.map(m => {
                  const isMe = m.sender_id === session.user_id;
                  const sender = users.find(u => u.user_id === m.sender_id);
                  return (
                    <div
                      key={m.message_id}
                      style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: isMe ? 'flex-start' : 'flex-end', // reversed alignment for RTL
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '72%'
                      }}
                    >
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                        {sender?.name || 'مستخدم NEMS'}
                      </div>
                      <div style={{
                        padding: '12px 16px', borderRadius: 'var(--radius-md)',
                        background: isMe ? 'var(--grad-red)' : 'var(--bg-input)',
                        color: isMe ? 'white' : 'var(--text-primary)',
                        fontSize: '13.5px', lineHeight: 1.55,
                        boxShadow: isMe ? 'var(--shadow-glow-red)' : 'none',
                        border: isMe ? 'none' : '1px solid var(--border-primary)',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                      }}>
                        {m.message_text}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'left' }}>
                        {timeOf(m.created_at)} {!isMe && !m.is_read ? '• جديد' : ''}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={msgEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSendMessage} style={{ padding: '16px 20px', borderTop: '1px solid var(--border-primary)', display: 'flex', gap: '10px', background: 'rgba(16, 18, 26, 0.4)' }}>
              <input
                id="message-input"
                type="text"
                className="form-input"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="اكتب رسالتك وسؤالك هنا..."
                required
                style={{ flex: 1 }}
              />
              <button id="send-msg-btn" type="submit" className="btn btn-primary" disabled={sending}>
                {sending ? '...' : 'إرسال 🚀'}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
            {conversations.length === 0
              ? 'لا توجد قنوات بعد — أنشئ أول قناة من الأعلى للبدء'
              : 'اختر محادثة من القائمة الجانبية للبدء'}
          </div>
        )}
      </div>
    </div>
  );
}
