'use client';

import { useEffect, useState } from 'react';

export default function SettingsModule({ session }) {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile management states
  const [profileName, setProfileName] = useState(session.name || '');
  const [profilePhone, setProfilePhone] = useState(session.phone || '');
  const [profileEmail, setProfileEmail] = useState(session.email || '');
  const [profileAvatar, setProfileAvatar] = useState(session.avatar || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch('/api/data/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: session.user_id,
          _userId: session.user_id,
          name: profileName,
          phone: profilePhone,
          email: profileEmail,
          avatar: profileAvatar,
        }),
      });

      const result = await res.json();
      if (result.success) {
        const updatedSession = { ...session, name: profileName, phone: profilePhone, email: profileEmail, avatar: profileAvatar };
        localStorage.setItem('nems-session', JSON.stringify(updatedSession));
        window.dispatchEvent(new Event('profile-change'));
        alert('تم تحديث ملفك الشخصي بنجاح!');
      } else {
        alert(result.error || 'فشلت عملية الحفظ');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data/system_settings');
      const data = await res.json();
      setSettings(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (id, value) => {
    try {
      const res = await fetch('/api/data/system_settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: id,
          _userId: session.user_id,
          value: String(value),
        }),
      });

      const result = await res.json();
      if (result.success) {
        setSettings(settings.map(s => s.setting_id === id ? { ...s, value: String(value) } : s));
      } else {
        alert(result.error || 'فشلت عملية التعديل');
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

  const categories = [...new Set(settings.map(s => s.category))];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ وحدة إعدادات النظام وتطبيقات الأعمال</h1>
          <p className="page-subtitle">تعديل الإعدادات العامة لشركة نوكسورا والتحكم بمعايير الحضور والرواتب</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* User Profile Card */}
        <div className="card">
          <h2 className="card-title mb-4" style={{ color: 'var(--noxora-yellow-light)' }}>👤 الملف الشخصي والمعلومات الأساسية</h2>
          <form onSubmit={handleSaveProfile} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '24px', alignItems: 'flex-start' }}>
            {/* Avatar upload */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div className="user-avatar" style={{ width: '100px', height: '100px', fontSize: '32px', position: 'relative', overflow: 'hidden', background: 'var(--bg-secondary)', border: '2px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {profileAvatar ? (
                  <img src={profileAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  session.name ? session.name[0] : 'N'
                )}
              </div>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', textAlign: 'center', width: '100%' }}>
                📁 اختر صورة
                <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Profile Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">الاسم الكامل</label>
                  <input
                    id="profile-name-input"
                    type="text"
                    className="form-input"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الهاتف</label>
                  <input
                    id="profile-phone-input"
                    type="text"
                    className="form-input"
                    value={profilePhone}
                    onChange={e => setProfilePhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">البريد الإلكتروني</label>
                <input
                  id="profile-email-input"
                  type="email"
                  className="form-input"
                  value={profileEmail}
                  onChange={e => setProfileEmail(e.target.value)}
                  required
                />
              </div>

              <button id="save-profile-btn" type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '10px' }} disabled={savingProfile}>
                {savingProfile ? '⏳ جاري الحفظ...' : '💾 حفظ التعديلات الشخصية'}
              </button>
            </div>
          </form>
        </div>

        {/* System Settings (Only shown for Admin/CEO) */}
        {['admin', 'ceo'].includes(session.role_name?.toLowerCase()) && categories.map(cat => {
          const catSettings = settings.filter(s => s.category === cat);
          return (
            <div key={cat} className="card">
              <h2 className="card-title mb-4" style={{ textTransform: 'uppercase', color: 'var(--noxora-red-light)' }}>
                ⚙️ إعدادات: {cat === 'company' ? 'الشركة' : cat === 'appearance' ? 'المظهر' : cat === 'attendance' ? 'الحضور والدوام' : cat}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {catSettings.map(s => (
                  <div key={s.setting_id} style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{s.label_ar || s.key}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>مفتاح: {s.key}</div>
                    </div>
                    <div>
                      {s.type === 'boolean' ? (
                        <select
                          id={`setting-select-${s.setting_id}`}
                          className="form-select"
                          value={s.value}
                          onChange={e => handleUpdateSetting(s.setting_id, e.target.value)}
                        >
                          <option value="true">مفعّل</option>
                          <option value="false">معطّل</option>
                        </select>
                      ) : (
                        <input
                          id={`setting-input-${s.setting_id}`}
                          type="text"
                          className="form-input"
                          value={s.value}
                          onChange={e => handleUpdateSetting(s.setting_id, e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
