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

  const toggleCurrency = () => {
    const nextCurr = curr === 'MRU' ? 'USD' : 'MRU';
    setPreferredCurrency(nextCurr);
  };

  useEffect(() => {
    const loadSession = () => {
      const sess = getSession();
      if (!sess) {
        router.push('/login');
        return;
      }
      setSession(sess);

      // Load notifications
      fetch('/api/notifications?userId=' + sess.user_id)
        .then(r => r.json())
        .then(data => {
          if (data.notifications) {
            setNotifications(data.notifications);
            setUnreadCount(data.notifications.filter(n => !n.is_read).length);
          }
        })
        .catch(() => {});
    };

    loadSession();

    window.addEventListener('profile-change', loadSession);
    return () => window.removeEventListener('profile-change', loadSession);
  }, [router]);

  // Close notifications on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  if (!session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="animate-spin" style={{ fontSize: '32px', marginBottom: '12px' }}>⟳</div>
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const modules = session.sidebar_modules || [];
  const roleKey = session.role_name?.toLowerCase();
  const roleColor = ROLE_COLORS[roleKey] || 'var(--noxora-red)';
  const dashboardPath = getDashboardPath(session.role_name);

  // Get initials for avatar
  const initials = session.name ? session.name.split(' ').map(w => w[0]).slice(0, 2).join('') : 'N';

  // Page title from pathname
  const currentModule = Object.entries(NAV_ITEMS).find(([, v]) => pathname.includes(v.path.split('/')[1]))
  const pageTitle = currentModule ? currentModule[1].label : 'لوحة التحكم';

  // Noxora AI: send message handler
  const handleAiSend = async (forceQuery) => {
    const query = forceQuery || aiInput.trim();
    if (!query || aiLoading) return;

    const userMsg = { role: 'user', text: query };
    const loadingMsg = { role: 'assistant', text: '', loading: true };
    setAiMessages(prev => [...prev, userMsg, loadingMsg]);
    setAiInput('');
    setAiLoading(true);
    setTimeout(() => aiEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      // Gather data from relevant endpoints
      const [revRes, expRes, empRes, projRes, attRes, salRes] = await Promise.all([
        fetch('/api/data/revenues'),
        fetch('/api/data/expenses'),
        fetch('/api/data/employees'),
        fetch('/api/data/projects'),
        fetch('/api/data/attendance'),
        fetch('/api/data/salaries'),
      ]);
      const revenues   = (await revRes.json()).data  || [];
      const expenses   = (await expRes.json()).data  || [];
      const employees  = (await empRes.json()).data  || [];
      const projects   = (await projRes.json()).data || [];
      const attendance = (await attRes.json()).data  || [];
      const salaries   = (await salRes.json()).data  || [];

      const totalRevenue = revenues.reduce((s, r) => s + Number(r.amount || 0), 0);
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
      const netProfit = totalRevenue - totalExpenses;
      const totalSalaries = salaries.reduce((s, sal) => s + Number(sal.net_salary || 0), 0);
      const activeEmps = employees.filter(e => e.employment_status === 'active').length;
      const delayedProjects = projects.filter(p => p.status === 'delayed' || p.status === 'at-risk');
      const todayAtt = attendance.filter(a => a.date === new Date().toISOString().split('T')[0]);

      const q = query.toLowerCase();
      let answer = '';

      if (q.includes('إيراد') || q.includes('دخل') || q.includes('revenue')) {
        answer = `📊 **تقرير الإيرادات**\n\nإجمالي الإيرادات المسجلة: **${totalRevenue.toLocaleString('ar')} MRU**\nعدد معاملات الإيراد: ${revenues.length} معاملة\n\nأعلى مصدر إيراد:\n${revenues.slice(0, 2).map(r => `• ${r.title}: ${Number(r.amount).toLocaleString('ar')} ${r.currency}`).join('\n')}`;
      } else if (q.includes('ربح') || q.includes('صافي') || q.includes('profit')) {
        answer = `💰 **تقرير الربحية**\n\nإجمالي الإيرادات: ${totalRevenue.toLocaleString('ar')} MRU\nإجمالي المصروفات: ${totalExpenses.toLocaleString('ar')} MRU\n\n**صافي الربح: ${netProfit.toLocaleString('ar')} MRU** ${netProfit > 0 ? '✅ ربح' : '❌ خسارة'}`;
      } else if (q.includes('مصروف') || q.includes('نفقة') || q.includes('expense')) {
        answer = `📤 **تقرير المصروفات**\n\nإجمالي المصروفات: **${totalExpenses.toLocaleString('ar')} MRU**\nعدد بنود المصروفات: ${expenses.length}\n\nآخر المصروفات:\n${expenses.slice(-2).map(e => `• ${e.title}: ${Number(e.amount).toLocaleString('ar')} ${e.currency}`).join('\n')}`;
      } else if (q.includes('موظف') || q.includes('فريق') || q.includes('employee')) {
        answer = `👥 **إحصاءات الموظفين**\n\nالموظفون النشطون: **${activeEmps}** من إجمالي ${employees.length}\nإجمالي الرواتب الشهرية: ${totalSalaries.toLocaleString('ar')} MRU\n\nالأقسام:\n${[...new Set(employees.map(e => e.department))].filter(Boolean).map(d => `• ${d}`).join('\n')}`;
      } else if (q.includes('مشروع') || q.includes('project') || q.includes('متأخر')) {
        answer = `📂 **تقرير المشاريع**\n\nإجمالي المشاريع: ${projects.length}\nمشاريع نشطة: ${projects.filter(p => p.status === 'active').length}\nمشاريع متأخرة أو في خطر: **${delayedProjects.length}** ${delayedProjects.length > 0 ? '⚠️' : '✅'}\n${delayedProjects.map(p => `• ${p.name} (${p.status})`).join('\n') || '• لا توجد مشاريع متأخرة'}`;
      } else if (q.includes('حضور') || q.includes('اليوم') || q.includes('بصمة')) {
        answer = `📊 **حضور اليوم**\n\nعدد سجلات الحضور اليوم: **${todayAtt.length}** بصمة\nالموظفون الحاضرون اليوم: ${[...new Set(todayAtt.map(a => a.employee_id))].length}\nإجمالي سجلات الحضور: ${attendance.length}`;
      } else if (q.includes('راتب') || q.includes('salary') || q.includes('رواتب')) {
        answer = `💵 **تقرير الرواتب**\n\nإجمالي الرواتب المصروفة: **${totalSalaries.toLocaleString('ar')} MRU**\nعدد سجلات الرواتب: ${salaries.length}\nرواتب معلقة: ${salaries.filter(s => s.payment_status === 'pending').length} راتب`;
      } else if (q.includes('ملخص') || q.includes('عام') || q.includes('شركة')) {
        answer = `🏛️ **ملخص الشركة الشامل**\n\n📊 الإيرادات: ${totalRevenue.toLocaleString('ar')} MRU\n📤 المصروفات: ${totalExpenses.toLocaleString('ar')} MRU\n💰 صافي الربح: **${netProfit.toLocaleString('ar')} MRU**\n\n👥 الموظفون: ${activeEmps} نشط\n📂 المشاريع: ${projects.length} (${delayedProjects.length} متأخرة)\n💵 الرواتب الشهرية: ${totalSalaries.toLocaleString('ar')} MRU`;
      } else {
        answer = `🤔 لم أتمكن من تحليل سؤالك بشكل دقيق. يمكنك سؤالي عن:\n\n• **الإيرادات والمصروفات** — الوضع المالي\n• **صافي الربح** — ربحية الشركة\n• **الموظفون** — الفريق والرواتب\n• **المشاريع** — التقدم والتأخير\n• **الحضور** — حضور الفريق اليوم\n• **ملخص عام** — نظرة شاملة على الشركة`;
      }

      setAiMessages(prev => prev.slice(0, -1).concat({ role: 'assistant', text: answer }));
    } catch {
      setAiMessages(prev => prev.slice(0, -1).concat({ role: 'assistant', text: '⚠️ تعذر جلب البيانات من الخادم. يرجى المحاولة مجدداً.' }));
    } finally {
      setAiLoading(false);
      setTimeout(() => aiEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  return (
    <div className="app-layout">
      {/* Mobile Overlay */}
      <div
        className={`sidebar-overlay ${mobileSidebarOpen ? 'active' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon" style={{ padding: '4px', background: '#ffffff' }}>
            <img src="/logo.png" alt="N" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="logo-text">
            <span className="brand">NEMS</span>
            <span className="tagline">Noxora Technologies</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {/* Dashboard link always first */}
          <Link
            href={dashboardPath}
            id="nav-dashboard"
            className={`sidebar-item ${pathname === dashboardPath ? 'active' : ''}`}
            onClick={() => setMobileSidebarOpen(false)}
          >
            <span className="item-icon">🏠</span>
            <span>لوحة التحكم</span>
          </Link>

          {modules.filter(m => m !== 'dashboard').length > 0 && (
            <>
              <div className="sidebar-section-title">الوحدات</div>
              {modules.filter(m => m !== 'dashboard').map(mod => {
                const item = NAV_ITEMS[mod];
                if (!item) return null;
                const fullPath = dashboardPath + item.path;
                const isActive = pathname.startsWith(fullPath);
                return (
                  <Link
                    key={mod}
                    href={fullPath}
                    id={`nav-${mod}`}
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileSidebarOpen(false)}
                  >
                    <span className="item-icon">{item.icon}</span>
                    <span>{item.label}</span>
                    {mod === 'messages' && unreadCount > 0 && (
                      <span className="item-badge">{unreadCount}</span>
                    )}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User Footer */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div className="sidebar-user" onClick={() => setShowProfileModal(true)} title="عرض الملف الشخصي" id="user-profile-btn" style={{ flex: 1, cursor: 'pointer' }}>
              <div className="user-avatar" style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}aa)` }}>
                {session.avatar ? (
                  <img src={session.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  initials
                )}
              </div>
              <div className="user-info">
                <div className="user-name">{session.name}</div>
                <div className="user-role">{session.role_name}</div>
              </div>
            </div>
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="topbar-btn"
              style={{ width: '32px', height: '32px', padding: 0 }}
              title="تسجيل الخروج"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Hamburger button - mobile only */}
            <button
              className="mobile-menu-btn"
              style={{ display: 'none' }}
              onClick={() => setMobileSidebarOpen(o => !o)}
              aria-label="القائمة"
            >
              ☰
            </button>
            <div style={{ fontWeight: 700, fontSize: '16px' }}>{pageTitle}</div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: `${roleColor}22`, border: `1px solid ${roleColor}44`,
              borderRadius: 'var(--radius-full)', padding: '2px 10px',
              fontSize: '11px', fontWeight: 700, color: roleColor
            }}>
              {session.role_name}
            </div>
          </div>

          <div className="topbar-search">
            <span className="search-icon">🔍</span>
            <input id="global-search" placeholder="بحث في النظام..." type="search" />
          </div>

          <div className="topbar-actions">
            {/* Notifications */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                id="notif-btn"
                className="topbar-btn"
                onClick={() => setNotifOpen(!notifOpen)}
                title="الإشعارات"
              >
                🔔
                {unreadCount > 0 && <span className="notif-dot" />}
              </button>

              {notifOpen && (
                <div className="notif-panel">
                  <div className="notif-header">
                    <span style={{ fontWeight: 700 }}>الإشعارات</span>
                    {unreadCount > 0 && (
                      <span className="badge badge-danger">{unreadCount} جديد</span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      لا توجد إشعارات
                    </div>
                  ) : (
                    notifications.slice(0, 5).map(n => (
                      <div key={n.notification_id} className={`notif-item ${!n.is_read ? 'unread' : ''}`}>
                        <div style={{ fontSize: '20px' }}>
                          {n.type === 'task' ? '📋' : n.type === 'finance' ? '💰' : '🔔'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '3px' }}>{n.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {n.message}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {n.created_at}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Currency Toggle Switcher */}
            <button
              id="currency-toggle-btn"
              className="btn btn-secondary btn-sm"
              onClick={toggleCurrency}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(243, 156, 18, 0.12)', border: '1px solid rgba(243, 156, 18, 0.35)',
                borderRadius: 'var(--radius-full)', padding: '4px 12px', fontWeight: 800,
                color: 'var(--noxora-yellow-light)', cursor: 'pointer', transition: 'all var(--transition-fast)'
              }}
              title="تبديل عملة العرض النظامية (1 USD = 39 MRU)"
            >
              💱 {curr}
            </button>

            {/* Settings shortcut */}
            <button
              id="settings-btn"
              className="topbar-btn"
              onClick={() => router.push(dashboardPath + '/settings')}
              title="الإعدادات"
            >
              ⚙️
            </button>

            {/* Avatar */}
            <div
              id="user-avatar-btn"
              className="user-avatar"
              onClick={() => setShowProfileModal(true)}
              style={{
                cursor: 'pointer', width: '36px', height: '36px', fontSize: '13px',
                background: `linear-gradient(135deg, ${roleColor}, ${roleColor}aa)`,
                border: `2px solid ${roleColor}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title="عرض وتعديل ملفي الشخصي"
            >
              {session.avatar ? (
                <img src={session.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          {children}
        </main>
      </div>

      {/* Global User Profile Modal */}
      {showProfileModal && (
        <UserProfileModal
          user={session}
          currentUser={session}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Noxora AI Floating Button */}
      <button
        id="noxora-ai-btn"
        onClick={() => setAiOpen(o => !o)}
        style={{
          position: 'fixed', bottom: '28px', left: '28px', zIndex: 9999,
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #C0392B, #922B21)',
          border: 'none', cursor: 'pointer', boxShadow: '0 8px 32px rgba(192,57,43,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', transition: 'all 0.3s',
          transform: aiOpen ? 'scale(1.1) rotate(15deg)' : 'scale(1)'
        }}
        title="مساعد نوكسورا الذكي"
      >
        {aiOpen ? '✕' : '🤖'}
      </button>

      {/* Noxora AI Drawer */}
      {aiOpen && (
        <div
          id="noxora-ai-drawer"
          style={{
            position: 'fixed', bottom: '96px', left: '28px', zIndex: 9998,
            width: '380px', maxHeight: '520px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-accent)',
            borderRadius: '20px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideUpFade 0.25s ease'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px 20px', background: 'linear-gradient(135deg, #922B21, #C0392B)',
            display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0
          }}>
            <div style={{ fontSize: '22px' }}>🤖</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '14px', color: '#fff' }}>نوكسورا AI</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)' }}>مساعد أعمال ذكي • بيانات حية</div>
            </div>
            <div style={{ marginRight: 'auto', width: '8px', height: '8px', borderRadius: '50%', background: '#2ECC71', boxShadow: '0 0 8px #2ECC71' }} />
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px',
            display: 'flex', flexDirection: 'column', gap: '12px',
            scrollbarWidth: 'thin'
          }}>
            {aiMessages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-start' : 'flex-end'
              }}>
                <div style={{
                  maxWidth: '86%', padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #C0392B, #922B21)'
                    : 'var(--bg-secondary)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  fontSize: '13px', lineHeight: 1.65,
                  border: msg.role === 'assistant' ? '1px solid var(--border-primary)' : 'none',
                  whiteSpace: 'pre-line'
                }}>
                  {msg.text}
                  {msg.loading && <span className="animate-pulse"> ●●●</span>}
                </div>
              </div>
            ))}
            <div ref={aiEndRef} />
          </div>

          {/* Quick prompts */}
          <div style={{
            padding: '8px 12px', borderTop: '1px solid var(--border-primary)',
            display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0
          }}>
            {['الإيرادات اليوم', 'المشاريع المتأخرة', 'صافي الربح', 'موظفو اليوم'].map(q => (
              <button
                key={q}
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px' }}
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
          <span className="bottom-nav-label">المزيد</span>
        </button>
      </nav>
    </div>
  );
}
