'use client';

import { useEffect, useState, useRef } from 'react';

export default function MessagesModule({ session }) {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState(null);
  const [text, setText] = useState('');
  const msgEndRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (msgEndRef.current) {
      msgEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeConv]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [convRes, msgRes, userRes] = await Promise.all([
        fetch('/api/data/conversations'),
        fetch('/api/data/messages'),
        fetch('/api/data/users'),
      ]);
      const convData = await convRes.json();
      const msgData = await msgRes.json();
      const userData = await userRes.json();

      setConversations(convData.data || []);
      setMessages(msgData.data || []);
      setUsers(userData.data || []);

      if (convData.data?.length > 0) {
        setActiveConv(convData.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text || !activeConv) return;

    try {
      const res = await fetch('/api/data/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: session.user_id,
          receiver_id: null,
          conversation_id: activeConv.conversation_id,
          message_text: text,
          file_id: null,
          is_read: false,
          status: 'sent',
          _userId: session.user_id,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setText('');
        // Refresh messages list
        const msgRes = await fetch('/api/data/messages');
        const msgData = await msgRes.json();
        setMessages(msgData.data || []);
      } else {
        alert(result.error || 'فشلت عملية الإرسال');
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
      </div>

      <div className="card messages-chat-layout" style={{ padding: 0, height: '72vh', overflow: 'hidden' }}>
        {/* Sidebar: list of chats */}
        <div style={{ borderLeft: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', background: 'rgba(16, 18, 26, 0.4)' }}>
          <div style={{ padding: '20px', fontWeight: 800, borderBottom: '1px solid var(--border-primary)', fontSize: '14.5px', color: 'var(--text-primary)' }}>💬 غرف التواصل المتاحة</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.map(c => (
              <div
                key={c.conversation_id}
                onClick={() => setActiveConv(c)}
                style={{
                  padding: '16px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border-primary)',
                  background: activeConv?.conversation_id === c.conversation_id ? 'var(--bg-card-hover)' : '',
                  borderRight: activeConv?.conversation_id === c.conversation_id ? '3px solid var(--noxora-red)' : 'none',
                  transition: 'all var(--transition-fast)'
                }}
                id={`chat-channel-${c.conversation_id}`}
              >
                <div style={{ fontWeight: 800, fontSize: '13.5px', color: activeConv?.conversation_id === c.conversation_id ? 'var(--noxora-red-light)' : 'var(--text-primary)', marginBottom: '4px' }}>
                  {c.type === 'project_team' ? '📂' : '👤'} {c.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>آخر تحديث: {c.last_message_at?.split(' ')[1]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat window */}
        {activeConv ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(16, 18, 26, 0.4)' }}>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>{activeConv.name}</div>
              <span className="badge badge-muted" style={{ fontSize: '10.5px' }}>قناة {activeConv.type === 'project_team' ? 'مشروع' : 'مباشرة'}</span>
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
                        border: isMe ? 'none' : '1px solid var(--border-primary)'
                      }}>
                        {m.message_text}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'left' }}>
                        {m.created_at?.split(' ')[1]}
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
              <button id="send-msg-btn" type="submit" className="btn btn-primary">إرسال 🚀</button>
            </form>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            اختر محادثة من القائمة الجانبية للبدء
          </div>
        )}
      </div>
    </div>
  );
}
