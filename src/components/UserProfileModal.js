'use client';

import { useState, useRef } from 'react';
import { formatCurrency } from '@/lib/format';
import { SESSION_KEY, getAuthHeaders } from '@/lib/auth';

export default function UserProfileModal({ user, currentUser, onClose, onUpdate }) {
  const isSelf = currentUser && (currentUser.user_id === user?.user_id || currentUser.user_id === user?.id);
  const canEdit = isSelf || ['admin', 'ceo', 'hr'].includes(currentUser?.role_name?.toLowerCase());

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // info | edit | password
  const fileInputRef = useRef(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('حجم الصورة يجب أن لا يتجاوز 2 ميغابايت');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxSize = 200;
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxSize) { h = h * maxSize / w; w = maxSize; } }
        else { if (h > maxSize) { w = w * maxSize / h; h = maxSize; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ file: dataUrl, filename: `avatar_${Date.now()}.jpg` }),
          });
          const result = await res.json();
          if (result.success) {
            setAvatar(result.url);
          } else {
            alert(result.error || 'فشل رفع الصورة');
          }
        } catch (err) {
          console.error('Avatar upload failed:', err);
          alert('تعذر رفع الصورة');
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const targetUserId = user.user_id || user.id;
      const res = await fetch('/api/data/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          _id: targetUserId,
          _userId: currentUser?.user_id,
          name, phone, email, avatar,
        }),
      });

      const result = await res.json();
      if (result.success) {
        if (isSelf) {
          // Re-fetch full session from login to ensure all fields are up-to-date
          try {
            const sessRes = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email, _refresh: true, _userId: user.user_id }),
            });
            const sessData = await sessRes.json();
            if (sessData.success && sessData.user) {
              localStorage.setItem(SESSION_KEY, JSON.stringify(sessData.user));
            } else {
              // Fallback: update locally
              const updatedSession = { ...currentUser, name, phone, email, avatar };
              localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
            }
          } catch (err) {
            console.error('Session re-fetch failed:', err);
            const updatedSession = { ...currentUser, name, phone, email, avatar };
            localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
          }
          window.dispatchEvent(new Event('profile-change'));
        }
        alert('تم تحديث بيانات الملف الشخصي بنجاح!');
        if (onUpdate) onUpdate({ ...user, name, phone, email, avatar });
        onClose();
      } else {
        alert(result.error || 'فشلت عملية حفظ التعديلات');
      }
    } catch (err) {
      console.error('Profile save failed:', err);
      alert('تعذر الاتصال بالخادم');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (newPassword.length < 6) {
      setPwdError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('كلمة المرور الجديدة وتأكيدها غير متطابقتين');
      return;
    }

    setPwdSaving(true);
    try {
      const targetUserId = user.user_id || user.id;
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          userId: targetUserId,
          currentPassword,
          newPassword,
          requesterId: currentUser?.user_id,
          requesterRole: currentUser?.role_name,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setPwdSuccess('✅ تم تغيير كلمة المرور بنجاح!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwdError(result.error || 'فشل تغيير كلمة المرور');
      }
    } catch (err) {
      console.error('Password change failed:', err);
      setPwdError('تعذر الاتصال بالخادم');
    } finally {
      setPwdSaving(false);
    }
  };

  const roleNamesAr = {
    admin: 'مدير النظام', ceo: 'المدير التنفيذي', fm: 'المدير المالي',
    hr: 'الموارد البشرية', pm: 'مدير المشاريع', employee: 'موظف', owner: 'مالك',
    shipping_agent: 'وكيل شحن'
  };

  const getUserInitials = (name) => {
    if (!name) return 'N';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'N';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (!user) return null;

  const roleColors = {
    admin: '#8B5CF6', ceo: '#C0392B', fm: '#F39C12',
    hr: '#27AE60', pm: '#3498DB', employee: '#1ABC9C', owner: '#E67E22'
  };
  const roleKey = (user.role_name || user.role || 'employee').toLowerCase();
  const roleColor = roleColors[roleKey] || 'var(--noxora-red)';
  const roleLabel = roleNamesAr[roleKey] || user.role_name || user.role;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1100, padding: '20px'
    }}>
      <div className="card animate-scaleUp" style={{
        maxWidth: '580px', width: '100%', maxHeight: '92vh', overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)', border: `1px solid ${roleColor}55`,
        padding: '0'
      }}>
        {/* Modal Header Cover */}
        <div style={{
          height: '110px',
          background: `linear-gradient(135deg, ${roleColor}dd 0%, var(--bg-secondary) 100%)`,
          position: 'relative',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          padding: '16px'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '14px', left: '14px',
              background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff',
              width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
              fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="إغلاق"
          >✕</button>
        </div>

        {/* Profile Header Info */}
        <div style={{ padding: '0 24px 24px 24px', marginTop: '-50px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
            {/* Avatar with click-to-change on edit tab */}
            <div style={{ position: 'relative', width: '90px', height: '90px' }}>
              <div
                className="user-avatar"
                style={{
                  width: '90px', height: '90px', fontSize: '32px',
                  border: '4px solid var(--bg-card)', boxShadow: 'var(--shadow-md)',
                  background: `linear-gradient(135deg, ${roleColor}, ${roleColor}aa)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', borderRadius: '50%',
                  position: 'absolute', top: 0, left: 0
                }}
              >
                {avatar ? (
                  <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  getUserInitials(user.name)
                )}
              </div>
              {activeTab === 'edit' && canEdit && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '90px', height: '90px',
                    opacity: 0, cursor: 'pointer', zIndex: 10
                  }}
                />
              )}
              {activeTab === 'edit' && canEdit && (
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  background: roleColor, borderRadius: '50%',
                  width: '28px', height: '28px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', border: '2px solid var(--bg-card)',
                  pointerEvents: 'none', zIndex: 11
                }}>
                  📷
                </div>
              )}
            </div>

            {/* Tab Buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                className={`btn ${activeTab === 'info' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setActiveTab('info')}
              >📋 البيانات</button>
              {canEdit && (
                <button
                  className={`btn ${activeTab === 'edit' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => setActiveTab('edit')}
                >✏️ تعديل</button>
              )}
              {(isSelf || ['admin', 'ceo', 'hr'].includes(currentUser?.role_name?.toLowerCase())) && (
                <button
                  className={`btn ${activeTab === 'password' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => { setActiveTab('password'); setPwdError(''); setPwdSuccess(''); }}
                >🔐 كلمة المرور</button>
              )}
            </div>
          </div>

          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)' }}>{user.name}</h2>
              <span className="badge" style={{ background: `${roleColor}22`, color: roleColor, border: `1px solid ${roleColor}44`, fontSize: '11px' }}>
                {roleLabel}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {user.job_title || 'عضو في فريق نوكسورا تكنولوجيز'} {user.department_name ? `· قسم ${user.department_name}` : ''}
            </p>
          </div>

          <div className="divider" style={{ margin: '16px 0' }} />

          {/* Tab 1: View Information */}
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>البريد الإلكتروني</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px', wordBreak: 'break-all' }}>{user.email}</div>
                </div>
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>رقم الهاتف</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>{user.phone || 'غير مدخل'}</div>
                </div>
                {user.employee_id && (
                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>الرقم الوظيفي</span>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>{user.employee_id}</div>
                  </div>
                )}
                {user.status && (
                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>حالة الحساب</span>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px', color: user.status === 'active' ? 'var(--success)' : 'var(--warning)' }}>
                      {user.status === 'active' ? 'نشط مفعّل 🟢' : user.status}
                    </div>
                  </div>
                )}
              </div>
              {(user.basic_salary !== undefined || user.epi_score !== undefined || user.national_id) && (
                <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--noxora-yellow-light)', marginBottom: '12px' }}>📊 تفاصيل عقد العمل والأداء (EPI)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                    {user.epi_score !== undefined && (
                      <div><span className="text-muted">مؤشر الأداء EPI:</span><span style={{ fontWeight: 800, color: 'var(--success)', marginRight: '6px' }}>{user.epi_score}%</span></div>
                    )}
                    {user.national_id && (
                      <div><span className="text-muted">الهوية الوطنية:</span><span style={{ fontWeight: 700, marginRight: '6px' }}>{user.national_id}</span></div>
                    )}
                    {user.basic_salary !== undefined && (
                      <div><span className="text-muted">الراتب الأساسي:</span><span style={{ fontWeight: 800, color: 'var(--noxora-yellow-light)', marginRight: '6px' }}>{formatCurrency(user.basic_salary)}</span></div>
                    )}
                    {user.emergency_contact && (
                      <div><span className="text-muted">طوارئ:</span><span style={{ fontWeight: 700, marginRight: '6px' }}>{user.emergency_contact} ({user.emergency_name || 'قريب'})</span></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Edit Profile */}
          {activeTab === 'edit' && canEdit && (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '14px', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-card)', border: '2px solid var(--border-secondary)', flexShrink: 0 }}>
                  {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{getUserInitials(name)}</div>}
                </div>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', pointerEvents: 'none' }}
                  >
                    📷 رفع صورة شخصية
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{
                      position: 'absolute', top: 0, left: 0,
                      width: '100%', height: '100%',
                      opacity: 0, cursor: 'pointer'
                    }}
                  />
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>JPG أو PNG · أقصى حجم 2MB · سيتم ضغطها تلقائياً</p>
                {avatar && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAvatar('')} style={{ marginRight: 'auto' }}>🗑️ حذف</button>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">الاسم الكامل</label>
                <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">رقم الهاتف</label>
                  <input type="text" className="form-input" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني</label>
                  <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? '⏳ جاري الحفظ...' : '💾 حفظ التعديلات'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('info')}>إلغاء</button>
              </div>
            </form>
          )}

          {/* Tab 3: Change Password */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px 16px', background: 'rgba(192,57,43,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(192,57,43,0.2)', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                🔐 لأسباب أمنية يجب إدخال كلمة المرور الحالية للتحقق من هويتك
              </div>

              {pwdError && (
                <div style={{ padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '13px', border: '1px solid rgba(192,57,43,0.3)' }}>
                  ⚠️ {pwdError}
                </div>
              )}
              {pwdSuccess && (
                <div style={{ padding: '10px 14px', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', color: 'var(--success)', fontSize: '13px', border: '1px solid rgba(39,174,96,0.3)' }}>
                  {pwdSuccess}
                </div>
              )}

              {/* Privileged roles (admin/ceo/hr) can skip current password for other users */}
              {(isSelf || ['admin', 'ceo', 'hr'].includes(currentUser?.role_name?.toLowerCase())) && (
                <div className="form-group">
                  <label className="form-label">كلمة المرور الحالية</label>
                  <input
                    type="password"
                    className="form-input"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الحالية"
                    required={isSelf}
                    autoComplete="current-password"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label className="form-label">تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  className="form-input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  required
                  autoComplete="new-password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <span style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '4px', display: 'block' }}>⚠️ كلمتا المرور غير متطابقتين</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={pwdSaving || !newPassword || !confirmPassword || newPassword !== confirmPassword}>
                  {pwdSaving ? '⏳ جاري التغيير...' : '🔐 تغيير كلمة المرور'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('info')}>إلغاء</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
