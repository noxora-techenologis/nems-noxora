'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setSession, getSession, getDashboardPath } from '@/lib/auth';

const DEMO_ACCOUNTS = [
  { label: 'مدير النظام', email: 'admin@noxora.com', password: 'admin123', color: '#8B5CF6' },
  { label: 'المدير العام', email: 'ceo@noxora.com', password: 'ceo123', color: '#C0392B' },
  { label: 'المالية', email: 'finance@noxora.com', password: 'finance123', color: '#F39C12' },
  { label: 'الموارد البشرية', email: 'hr@noxora.com', password: 'hr123', color: '#27AE60' },
  { label: 'مدير المشروع', email: 'pm@noxora.com', password: 'pm123', color: '#3498DB' },
  { label: 'موظف', email: 'emp@noxora.com', password: 'emp123', color: '#1ABC9C' },
  { label: 'المالك', email: 'owner@noxora.com', password: 'owner123', color: '#E67E22' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    const session = getSession();
    if (session) {
      router.push(getDashboardPath(session.role_name));
    }
  }, [router]);

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'فشل تسجيل الدخول.');
        return;
      }

      // Save session
      setSession(data.user);

      // Redirect to role-specific dashboard
      router.push(getDashboardPath(data.user.role_name));

    } catch (err) {
      setError('تعذر الاتصال بالخادم. تحقق من الاتصال بالإنترنت.');
    } finally {
      setLoading(false);
    }
  };

  const fillAccount = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="login-page">
      {/* Background orbs */}
      <div className="login-bg-orb red" />
      <div className="login-bg-orb yellow" />

      {/* Animated grid lines */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(var(--noxora-red) 1px, transparent 1px), linear-gradient(90deg, var(--noxora-red) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon" style={{ padding: '6px', background: '#ffffff' }}>
            <img src="/logo.png" alt="Noxora Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div className="login-title">NEMS</div>
            <div className="login-subtitle">Noxora Enterprise Management System</div>
          </div>
        </div>

        <h2 className="login-h2">تسجيل الدخول</h2>
        <p className="login-desc">أدخل بيانات حسابك للدخول إلى النظام</p>

        {/* Error message */}
        {error && (
          <div className="login-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* Email */}
          <div className="login-input-wrap">
            <span className="input-icon">📧</span>
            <input
              id="email-input"
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div className="login-input-wrap">
            <span className="input-icon" style={{ cursor: 'pointer' }} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? '🙈' : '🔒'}
            </span>
            <input
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="كلمة المرور"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="login-btn"
            disabled={loading || !email || !password}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="animate-spin" style={{ display: 'inline-block', fontSize: '16px' }}>⟳</span>
                جاري التحقق...
              </span>
            ) : (
              'دخول إلى النظام ←'
            )}
          </button>
        </form>


        {/* Footer */}
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>🔐 جميع البيانات محمية ومشفرة</span>
          <span style={{ margin: '0 8px' }}>·</span>
          <span>Noxora Technologies © 2026</span>
        </div>
      </div>
    </div>
  );
}
