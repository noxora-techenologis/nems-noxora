'use client';

import { useEffect, useState } from 'react';
import { getAuthHeaders } from '@/lib/auth';
import { ALL_POSITIONS, POSITION_ROLE_MAP } from '@/lib/positions';

import UserProfileModal from '@/components/UserProfileModal';

export default function UsersModule({ session }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedOption, setSelectedOption] = useState('EMPLOYEE'); // position code or ROLE_<id>

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usrRes, roleRes] = await Promise.all([
        fetch('/api/data/users', { headers: getAuthHeaders() }),
        fetch('/api/data/roles', { headers: getAuthHeaders() }),
      ]);
      const usrData = await usrRes.json();
      const roleData = await roleRes.json();

      setUsers(usrData.data || []);
      setRoles(roleData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Build a combined list of ALL job positions + system roles not already covered
  const roleIdByName = {};
  (roles || []).forEach(r => {
    roleIdByName[(r.role_name || '').toLowerCase()] = r.role_id;
  });

  const positionOptions = ALL_POSITIONS.map(p => {
    const roleKey = POSITION_ROLE_MAP[p.code] || 'employee';
    return {
      value: p.code,
      label: p.name,
      roleId: roleIdByName[roleKey] || 6,
    };
  });

  const systemRoleOptions = (roles || [])
    .filter(r => !ALL_POSITIONS.some(p => (POSITION_ROLE_MAP[p.code] || 'employee').toLowerCase() === (r.role_name || '').toLowerCase()))
    .map(r => ({
      value: `ROLE_${r.role_id}`,
      label: `${r.role_name} (نظام)`,
      roleId: r.role_id,
    }));

  const allOptions = [...positionOptions, ...systemRoleOptions];

  const OWNER_ROLE_ID = 7;

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    if (password.length < 6) {
      alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    const option = allOptions.find(o => o.value === selectedOption) || positionOptions.find(o => o.value === 'EMPLOYEE');
    const roleId = option?.roleId || 6;
    const jobTitle = option?.label || 'موظف';
    const isOwnerRole = Number(roleId) === OWNER_ROLE_ID;

    try {
      const res = await fetch('/api/data/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          name: name,
          email: email,
          password_hash: password,
          role_id: Number(roleId),
          status: 'active',
          avatar: '',
          phone: '',
          _userId: session.user_id,
        }),
      });

      const result = await res.json();
      if (result.success) {
        const newUser = result.data;

        if (isOwnerRole) {
          // Create owner record
          try {
            const ownerRes = await fetch('/api/data/owners', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
              body: JSON.stringify({
                user_id: newUser.user_id,
                name: name,
                email: email,
                total_shares: 0,
                share_percentage: 0,
                join_date: new Date().toISOString().split('T')[0],
                status: 'active',
                active_roles: JSON.stringify(['OWNER']),
                _userId: session.user_id,
              }),
            });
            const ownerResult = await ownerRes.json();

            // Create shares record for the new owner
            if (ownerResult.success && ownerResult.data?.owner_id) {
              await fetch('/api/data/shares', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({
                  owner_id: ownerResult.data.owner_id,
                  total_shares: 0,
                  ownership_percentage: 0,
                  class: 'common',
                  status: 'active',
                  _userId: session.user_id,
                }),
              });
            }
          } catch { /* ignore owner creation errors */ }
          alert('تم إنشاء حساب المالك بنجاح! يمكنه الآن تسجيل الدخول والدخول إلى لوحة الملاك.');
        } else {
          // Auto-create employee record for non-owner roles
          let empCreated = false;
          try {
            const empRes = await fetch('/api/data/employees', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
              body: JSON.stringify({
                user_id: newUser.user_id,
                name: name,
                email: email,
                job_title: jobTitle.replace(' (نظام)', ''),
                department_id: 1,
                salary: 0,
                employment_status: 'active',
                _userId: session.user_id,
              }),
            });
            const empResult = await empRes.json();
            empCreated = empResult.success;
          } catch { /* ignore */ }
          alert(empCreated
            ? 'تم إنشاء حساب المستخدم وإضافته كموظف تلقائياً!'
            : 'تم إنشاء حساب المستخدم بنجاح. يمكنك إضافة بيانات الموظف يدوياً من وحدة الموظفين.');
        }

        setName('');
        setEmail('');
        setPassword('');
        setShowForm(false);
        fetchData();
      } else {
        alert(result.error || 'فشلت عملية الإضافة');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    if (userId === session.user_id) {
      alert('لا يمكنك إيقاف حسابك الخاص!');
      return;
    }
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch('/api/data/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          _id: userId,
          _userId: session.user_id,
          status: nextStatus,
        }),
      });

      const result = await res.json();
      if (result.success) {
        fetchData();
      } else {
        alert(result.error || 'فشل تبديل حالة الحساب');
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👤 وحدة إدارة حسابات المستخدمين</h1>
          <p className="page-subtitle">إدارة صلاحيات الدخول، تعيين الأدوار الإدارية، وإلغاء تنشيط الحسابات</p>
        </div>
        {!showForm && (
          <button id="add-user-modal-btn" className="btn btn-primary btn-md" onClick={() => setShowForm(true)}>
            ➕ مستخدم جديد
          </button>
        )}
      </div>

      <div className="grid-cols-2-1">
        {/* Left: Users table */}
        <div className="card">
          <h2 className="card-title mb-4">الحسابات المسجلة ({users.length})</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>البريد</th>
                  <th>الدور</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const role = roles.find(r => r.role_id === u.role_id);
                  const fullUser = { ...u, role_name: role?.role_name || 'Employee' };
                  return (
                    <tr key={u.user_id} id={`user-row-${u.user_id}`}>
                      <td>
                        <div
                          style={{ fontWeight: 700, cursor: 'pointer', color: 'var(--noxora-yellow-light)' }}
                          onClick={() => setSelectedUser(fullUser)}
                          title="انقر لفتح الملف الشخصي"
                        >
                          👤 {u.name}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td><span className="badge badge-red">{role?.role_name || '-'}</span></td>
                      <td>
                        <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                          {u.status === 'active' ? 'نشط' : 'موقوف'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedUser(fullUser)}
                            title="عرض وتعديل الملف الشخصي"
                          >
                            👁️ الملف
                          </button>
                          <button
                            id={`toggle-user-status-${u.user_id}`}
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleToggleStatus(u.user_id, u.status)}
                          >
                            🔄 الحالة
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: add user form */}
        <div>
          {showForm ? (
            <div className="card">
              <h2 className="card-title mb-4">➕ إضافة حساب مستخدم جديد</h2>
              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">الاسم الكامل</label>
                  <input
                    id="new-user-name"
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="أحمد علي..."
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني</label>
                  <input
                    id="new-user-email"
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="user@noxora.com..."
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">كلمة المرور الافتراضية</label>
                  <input
                    id="new-user-pwd"
                    type="password"
                    className="form-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">الدور الوظيفي والـ Dashboard</label>
                  <select
                    id="new-user-role"
                    className="form-select"
                    value={selectedOption}
                    onChange={e => setSelectedOption(e.target.value)}
                  >
                    {allOptions.map(o => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    يتم ربط المنصب تلقائياً بالصلاحيات والـ Dashboard المناسب
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button id="save-user-btn" type="submit" className="btn btn-primary" style={{ flex: 1 }}>حفظ وإنشاء الحساب</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>إلغاء</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="card text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
              <span>💡</span>
              <p style={{ marginTop: '8px' }}>يتيح نظام NEMS تحكماً كاملاً للأدمن لإدارة الحسابات وربطها بالأدوار لضمان الأمان الأقصى للشركة</p>
            </div>
          )}
        </div>
      </div>

      {selectedUser && (
        <UserProfileModal
          user={selectedUser}
          currentUser={session}
          onClose={() => setSelectedUser(null)}
          onUpdate={() => fetchData()}
        />
      )}
    </div>
  );
}
