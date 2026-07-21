'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, getDashboardPath } from '@/lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    const target = session ? getDashboardPath(session.role_name, session.dashboard_type) : '/login';
    // Use window.location for WebView compatibility (router.replace can fail in some WebViews)
    if (typeof window !== 'undefined') {
      window.location.href = target;
    } else {
      router.replace(target);
    }
  }, [router]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg-primary)', flexDirection: 'column', gap: '16px'
    }}>
      <div className="animate-spin" style={{ fontSize: '40px' }}>⟳</div>
      <p style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal, sans-serif' }}>جاري التوجيه...</p>
    </div>
  );
}
