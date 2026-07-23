'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSession, hasAccess } from '@/lib/auth';
import DashboardLayout from '@/components/DashboardLayout';

// Import our module components dynamically or conditionally
import EmployeesModule from '@/components/modules/EmployeesModule';
import AttendanceModule from '@/components/modules/AttendanceModule';
import ProjectsModule from '@/components/modules/ProjectsModule';
import ClientsModule from '@/components/modules/ClientsModule';
import FinanceModule from '@/components/modules/FinanceModule';
import OwnersModule from '@/components/modules/OwnersModule';
import MeetingsModule from '@/components/modules/MeetingsModule';
import DocumentsModule from '@/components/modules/DocumentsModule';
import MessagesModule from '@/components/modules/MessagesModule';
import ReportsModule from '@/components/modules/ReportsModule';
import SettingsModule from '@/components/modules/SettingsModule';
import UsersModule from '@/components/modules/UsersModule';
import LogsModule from '@/components/modules/LogsModule';

export default function DynamicModulePage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const role = params.role;
  const module = params.module;

  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/login');
      return;
    }

    // Verify if the role in URL matches session role to prevent URL manipulation
    if (sess.role_name.toLowerCase() !== role.toLowerCase()) {
      router.push('/login');
      return;
    }

    // Verify if the user has access to this module
    if (!hasAccess(role, module, sess)) {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    setSession(sess);
    setAuthorized(true);
    setLoading(false);
  }, [role, module, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justify: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="animate-spin" style={{ fontSize: '32px', marginBottom: '12px' }}>⟳</div>
          <p>جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <DashboardLayout>
        <div className="card text-center" style={{ padding: '40px', margin: '40px auto', maxWidth: '500px' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🚫</span>
          <h2 style={{ color: 'var(--danger)', marginBottom: '8px' }}>غير مصرح بالوصول</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            ليس لديك صلاحية لعرض وحدة "{module}" في نظام NEMS.
          </p>
          <button className="btn btn-primary" onClick={() => router.back()}>العودة للخلف</button>
        </div>
      </DashboardLayout>
    );
  }

  // Render correct module based on URL parameter
  const renderModule = () => {
    switch (module) {
      case 'employees':
        return <EmployeesModule session={session} />;
      case 'attendance':
        return <AttendanceModule session={session} />;
      case 'projects':
        return <ProjectsModule session={session} />;
      case 'clients':
        return <ClientsModule session={session} />;
      case 'finance':
        return <FinanceModule session={session} />;
      case 'owners':
        return <OwnersModule session={session} />;
      case 'meetings':
        return <MeetingsModule session={session} />;
      case 'documents':
        return <DocumentsModule session={session} />;
      case 'messages':
        return <MessagesModule session={session} />;
      case 'reports':
        return <ReportsModule session={session} />;
      case 'settings':
        return <SettingsModule session={session} />;
      case 'users':
        return <UsersModule session={session} />;
      case 'logs':
        return <LogsModule session={session} />;
      default:
        return (
          <div className="card text-center" style={{ padding: '40px' }}>
            <h2>هذه الوحدة قيد التطوير</h2>
            <p style={{ color: 'var(--text-muted)' }}>الوحدة: {module}</p>
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      {renderModule()}
    </DashboardLayout>
  );
}
