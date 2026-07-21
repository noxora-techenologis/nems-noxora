'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getSession, clearSession, getDashboardPath, hasAccess } from '@/lib/auth';
import { getPreferredCurrency, setPreferredCurrency } from '@/lib/format';

import UserProfileModal from '@/components/UserProfileModal';

// Navigation items per module
const NAV_ITEMS = {
  dashboard:  { icon: '🏠', label: 'لوحة التحكم', path: '/dashboard' },
  employees:  { icon: '👥', label: 'الموظفون', path: '/employees' },
  attendance: { icon: '📊', label: 'الحضور', path: '/attendance' },
  projects:   { icon: '📂', label: 'المشاريع', path: '/projects' },
  clients:    { icon: '💼', label: 'العملاء', path: '/clients' },
  finance:    { icon: '💰', label: 'المالية', path: '/finance' },
  owners:     { icon: '🏛️', label: 'الملاك والأسهم', path: '/owners' },
  meetings:   { icon: '📅', label: 'الاجتماعات', path: '/meetings' },
  documents:  { icon: '📎', label: 'الوثائق', path: '/documents' },
  messages:   { icon: '💬', label: 'الرسائل', path: '/messages' },
  reports:    { icon: '📈', label: 'التقارير', path: '/reports' },
  settings:   { icon: '⚙️', label: 'الإعدادات', path: '/settings' },
  users:      { icon: '👤', label: 'المستخدمون', path: '/users' },
  logs:       { icon: '📋', label: 'سجل النظام', path: '/logs' },
};

const ROLE_COLORS = {
  admin: '#8B5CF6', ceo: '#C0392B', fm: '#F39C12',
  hr: '#27AE60', pm: '#3498DB', employee: '#1ABC9C', owner: '#E67E22'
};

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);
  const [curr, setCurr] = useState('MRU');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Noxora AI state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', text: 'مرحباً! أنا **نوكسورا AI** — مساعدك الذكي لتحليل بيانات الشركة. يمكنك سؤالي عن أي شيء مثل:\n\n• "ما إجمالي الإيرادات الشهرية؟"\n• "هل هناك مشاريع تجاوزت ميزانيتها؟"\n• "من الموظف المتأخر هذا الأسبوع؟"\n• "ما صافي الربح الحالي للشركة؟"' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiEndRef = useRef(null);

  useEffect(() => {
    setCurr(getPreferredCurrency());
    const handleCurrChange = () => setCurr(getPreferredCurrency());
    window.addEventListener('currency-change', handleCurrChange);
    return () => window.removeEventListener('currency-change', handleCurrChange);
  }, []);

  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/login');
      return;
    }
    setSession(sess);

    // Fetch user notifications
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          const userNotifs = data.data.filter(n => n.user_id === sess.user_id || n.user_id === null);
          setNotifications(userNotifs);
          setUnreadCount(userNotifs.filter(n => !n.is_read).length);
        }
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (aiOpen) {
      aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, aiOpen]);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const handleCurrencyToggle = () => {
    const nextCurr = curr === 'MRU' ? 'USD' : 'MRU';
    setPreferredCurrency(nextCurr);
    setCurr(nextCurr);
  };

  const handleAiSend = async (customPrompt) => {
    const textToSend = customPrompt || aiInput;
    if (!textToSend.trim() || aiLoading) return;

    const userMsg = { role: 'user', text: textToSend };
    setAiMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setAiInput('');
    setAiLoading(true);

    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend, session }),
      });
      const data = await res.json();
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        text: data.reply || 'عذراً، لم أستطع تحليل هذا الإجراء في الوقت الحالي.'
      }]);
    } catch {
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        text: '⚠️ تعذر الاتصال بمحرك **Noxora AI**. يرجى المحاولة لاحقاً.'
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  if (!session) return null;

  const roleKey = (session.role_name || '').toLowerCase();
  const roleColor = ROLE_COLORS[roleKey] || 'var(--noxora-red)';
  const dashboardPath = getDashboardPath(session.role_name);
  const modules = session.sidebar_modules || [];

  return (
    <div className="app-layout">
      {/* Mobile Drawer Overlay */}
      <div
        className={`sidebar-overlay ${mobileSidebarOpen ? 'active' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">
            <img src="/logo.png" alt="Noxora Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          </div>
          <div className="logo-text">
            <div className="brand-name">NEMS</div>
            <div className="brand-sub">Noxora Technologies</div>
          </div>
        </div>

        <div className="sidebar-role-badge">
          <div className="role-dot" style={{ background: roleColor }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 800 }}>{session.name}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {session.role_name} — {session.department_name || 'إدارة'}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">الوحدات المتاحة</div>
          {modules.map(modKey => {
            const item = NAV_ITEMS[modKey];
            if (!item) return null;
            const fullPath = modKey === 'dashboard' ? dashboardPath : `${dashboardPath}/${modKey}`;
            const isActive = pathname === fullPath;

            return (
              <Link
                key={modKey}
                href={fullPath}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileSidebarOpen(false)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className="nav-item"
            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'right', cursor: 'pointer' }}
            onClick={() => { setShowProfileModal(true); setMobileSidebarOpen(false); }}
          >
            <span className="nav-icon">👤</span>
            <span className="nav-label">الملف الشخصي</span>
          </button>

          <button
            onClick={handleLogout}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}
          >
            🚪 تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileSidebarOpen(o => !o)}
            title="القائمة"
          >
            ☰
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 800, fontSize: '15px' }}>NEMS</span>
            <span className="badge" style={{ background: `${roleColor}22`, color: roleColor, border: `1px solid ${roleColor}44` }}>
              {session.role_name}
            </span>
          </div>

          <div className="topbar-actions">
            {/* Currency Switcher */}
            <button
              id="currency-toggle-btn"
              onClick={handleCurrencyToggle}
              className="btn btn-secondary btn-sm"
              title="تغيير عملة العرض"
              style={{ fontWeight: 800 }}
            >
              💱 {curr === 'MRU' ? 'أوقية (MRU)' : 'دولار ($)'}
            </button>

            {/* Notifications Dropdown */}
            <div className="notif-wrapper" ref={notifRef} style={{ position: 'relative' }}>
              <button
                id="notif-btn"
                className="topbar-btn"
                onClick={() => setNotifOpen(o => !o)}
                title="الإشعارات"
              >
                🔔
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>

              {notifOpen && (
                <div className="notif-dropdown animate-scaleUp">
                  <div className="notif-header">
                    <span>🔔 التنبيهات والإشعارات</span>
                    <span className="badge badge-danger">{unreadCount} جديد</span>
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        لا يوجد إشعارات حالياً
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.notification_id || Math.random()} className={`notif-item ${!n.is_read ? 'unread' : ''}`}>
                          <div className="notif-title">{n.title}</div>
                          <div className="notif-msg">{n.message}</div>
                          <div className="notif-time">{n.created_at || 'الآن'}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar Button */}
            <div
              id="user-avatar-btn"
              className="user-avatar"
              onClick={() => setShowProfileModal(true)}
              style={{
                width: '38px', height: '38px', cursor: 'pointer',
                background: `linear-gradient(135deg, ${roleColor}, ${roleColor}88)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', borderRadius: '50%', border: '2px solid var(--border-secondary)'
              }}
              title="عرض الملف الشخصي"
            >
              {session.avatar ? (
                <img src={session.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                session.name ? session.name[0] : 'N'
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          {children}
        </div>
      </main>

      {/* Floating Noxora AI Button */}
      <button
        id="noxora-ai-btn"
        onClick={() => setAiOpen(o => !o)}
        title="Noxora AI MNS"
        style={{
          position: 'fixed', bottom: '78px', left: '16px', zIndex: 1000,
          width: '52px', height: '52px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--noxora-red), #E74C3C)',
          color: '#fff', border: '2px solid rgba(255,255,255,0.2)',
          fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 8px 32px rgba(192,57,43,0.5)',
          transition: 'all 0.3s ease'
        }}
      >
        ✨
      </button>

      {/* Noxora AI Drawer */}
      {aiOpen && (
        <div
          id="noxora-ai-drawer"
          className="animate-scaleUp"
          style={{
            position: 'fixed', bottom: '138px', left: '16px', zIndex: 1001,
            width: '370px', maxWidth: 'calc(100vw - 32px)', height: '480px', maxHeight: '65vh',
            background: 'rgba(16, 18, 26, 0.95)', backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* AI Header */}
          <div style={{
            padding: '14px 16px', background: 'linear-gradient(135deg, var(--noxora-red-dark) 0%, var(--bg-secondary) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-accent)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>✨</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '14px', color: '#fff' }}>Noxora AI</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>مساعد الموارد والأعمال الذكي</div>
              </div>
            </div>
            <button
              onClick={() => setAiOpen(false)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}
            >✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {aiMessages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  background: m.role === 'user' ? 'var(--noxora-red)' : 'var(--bg-card)',
                  color: '#fff', fontSize: '12.5px', lineHeight: 1.5,
                  border: m.role === 'user' ? 'none' : '1px solid var(--border-primary)',
                  boxShadow: 'var(--shadow-sm)', whiteSpace: 'pre-line'
                }}
              >
                {m.text}
              </div>
            ))}
            {aiLoading && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                ⏳ جاري التحليل والمعالجة...
              </div>
            )}
            <div ref={aiEndRef} />
          </div>

          {/* Quick Prompts */}
          <div style={{ padding: '6px 10px', background: 'var(--bg-primary)', display: 'flex', gap: '6px', overflowX: 'auto' }}>
            {['💰 إجمالي الإيرادات', '📊 ملخص الحضور', '📂 حالة المشاريع'].map((q, i) => (
              <button
                key={i}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', padding: '4px 8px', whiteSpace: 'nowrap', borderRadius: '20px' }}
                onClick={() => handleAiSend(q)}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{
            padding: '12px 14px', borderTop: '1px solid var(--border-primary)',
            display: 'flex', gap: '8px', flexShrink: 0
          }}>
            <input
              id="ai-input"
              type="text"
              className="form-input"
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAiSend()}
              placeholder="اسألني عن أي شيء..."
              style={{ flex: 1, fontSize: '13px', borderRadius: '12px' }}
              disabled={aiLoading}
            />
            <button
              id="ai-send-btn"
              className="btn btn-primary btn-sm"
              onClick={() => handleAiSend()}
              disabled={aiLoading || !aiInput.trim()}
              style={{ borderRadius: '12px', minWidth: '42px' }}
            >
              {aiLoading ? '⟳' : '↑'}
            </button>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showProfileModal && (
        <UserProfileModal
          user={session}
          currentUser={session}
          onClose={() => setShowProfileModal(false)}
          onUpdate={(newSess) => {
            setSession(prev => ({ ...prev, ...newSess }));
          }}
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <Link href={dashboardPath} className={`bottom-nav-item ${pathname === dashboardPath ? 'active' : ''}`}>
          <span className="bottom-nav-icon">🏠</span>
          <span className="bottom-nav-label">الرئيسية</span>
        </Link>
        {modules.includes('employees') && (
          <Link href={`${dashboardPath}/employees`} className={`bottom-nav-item ${pathname.includes('/employees') ? 'active' : ''}`}>
            <span className="bottom-nav-icon">👥</span>
            <span className="bottom-nav-label">الموظفون</span>
          </Link>
        )}
        {modules.includes('finance') && (
          <Link href={`${dashboardPath}/finance`} className={`bottom-nav-item ${pathname.includes('/finance') ? 'active' : ''}`}>
            <span className="bottom-nav-icon">💰</span>
            <span className="bottom-nav-label">المالية</span>
          </Link>
        )}
        {modules.includes('projects') && (
          <Link href={`${dashboardPath}/projects`} className={`bottom-nav-item ${pathname.includes('/projects') ? 'active' : ''}`}>
            <span className="bottom-nav-icon">📂</span>
            <span className="bottom-nav-label">المشاريع</span>
          </Link>
        )}
        <button className="bottom-nav-item" onClick={() => setMobileSidebarOpen(o => !o)}>
          <span className="bottom-nav-icon">☰</span>
          <span className="bottom-nav-label">القائمة</span>
        </button>
      </nav>
    </div>
  );
}
