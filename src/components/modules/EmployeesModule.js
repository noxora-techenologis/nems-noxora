'use client';

import { useEffect, useState } from 'react';
import { formatCurrency as formatCurrencyImport } from '@/lib/format';
import { getAuthHeaders } from '@/lib/auth';

import UserProfileModal from '@/components/UserProfileModal';

export default function EmployeesModule({ session }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [, setCurrTick] = useState(0);

  useEffect(() => {
    const handleCurrChange = () => setCurrTick(t => t + 1);
    window.addEventListener('currency-change', handleCurrChange);
    return () => window.removeEventListener('currency-change', handleCurrChange);
  }, []);

  // Form states for adding/editing employee
  const [jobTitle, setJobTitle] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [allowances, setAllowances] = useState('');
  const [empStatus, setEmpStatus] = useState('active');
  const [deptId, setDeptId] = useState('');
  const [salaryType, setSalaryType] = useState('monthly');
  const [hourlyRate, setHourlyRate] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [contractType, setContractType] = useState('');
  const [nationality, setNationality] = useState('');
  const [gender, setGender] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [saving, setSaving] = useState(false);

  const canManage = ['admin', 'ceo', 'hr'].includes(session.role_name?.toLowerCase());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, deptRes, usrRes, roleRes] = await Promise.all([
        fetch('/api/data/employees', { headers: getAuthHeaders() }),
        fetch('/api/data/departments', { headers: getAuthHeaders() }),
        fetch('/api/data/users', { headers: getAuthHeaders() }),
        fetch('/api/data/roles', { headers: getAuthHeaders() }),
      ]);
      const empData = await empRes.json();
      const deptData = await deptRes.json();
      const usrData = await usrRes.json();
      const roleData = await roleRes.json();
      setEmployees(empData.data || []);
      setDepartments(deptData.data || []);
      setUsers(usrData.data || []);
      setRoles(roleData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (emp) => {
    setSelectedEmp(emp);
    setJobTitle(emp.job_title || '');
    setBasicSalary(emp.basic_salary ?? emp.salary ?? '');
    setAllowances(emp.allowances ?? '');
    setEmpStatus(emp.employment_status || 'active');
    setDeptId(emp.department_id || '');
    setSalaryType(emp.salary_type || 'monthly');
    setHourlyRate(emp.hourly_rate ?? '');
    setHireDate(emp.hire_date ? emp.hire_date.split('T')[0] : '');
    setContractType(emp.contract_type || '');
    setNationality(emp.nationality || '');
    setGender(emp.gender || '');
    setNationalId(emp.national_id || '');
    setEmpPhone(emp.phone || '');
    setEmpEmail(emp.email || '');
    setAddress(emp.address || '');
    setEmergencyContact(emp.emergency_contact || '');
    setEmergencyName(emp.emergency_name || '');
    setEmergencyRelation(emp.emergency_relation || '');
    setEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedEmp) return;

    if (salaryType === 'hourly' && (!hourlyRate || Number(hourlyRate) <= 0)) {
      alert('يجب إدخال سعر الساعة بشكل صحيح');
      return;
    }
    if (salaryType === 'monthly' && (!basicSalary || Number(basicSalary) <= 0)) {
      alert('يجب إدخال الراتب الأساسي بشكل صحيح');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        _id: selectedEmp.employee_id,
        _userId: session.user_id,
        job_title: jobTitle,
        department_id: deptId ? Number(deptId) : null,
        basic_salary: basicSalary ? Number(basicSalary) : 0,
        allowances: allowances ? Number(allowances) : 0,
        employment_status: empStatus,
        salary_type: salaryType,
        hourly_rate: salaryType === 'hourly' ? Number(hourlyRate) : 0,
        hire_date: hireDate || null,
        contract_type: contractType || null,
        nationality: nationality || null,
        gender: gender || null,
        national_id: nationalId || null,
        phone: empPhone || null,
        email: empEmail || null,
        address: address || null,
        emergency_contact: emergencyContact || null,
        emergency_name: emergencyName || null,
        emergency_relation: emergencyRelation || null,
      };

      const res = await fetch('/api/data/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) {
        const updated = { ...selectedEmp, ...payload };
        setEmployees(employees.map(emp =>
          emp.employee_id === selectedEmp.employee_id ? updated : emp
        ));
        setSelectedEmp(updated);
        setEditing(false);
        alert('تم حفظ التعديلات بنجاح!');
      } else {
        alert(result.error || 'فشلت عملية الحفظ');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    } finally {
      setSaving(false);
    }
  };

  const filtered = employees.filter(emp =>
    (emp.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (emp.job_title || '').toLowerCase().includes(search.toLowerCase()) ||
    String(emp.employee_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (emp.nationality || '').toLowerCase().includes(search.toLowerCase()) ||
    (emp.email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="animate-spin" style={{ fontSize: '32px' }}>⟳</div>
      </div>
    );
  }

  const formatCurrency = (n) => formatCurrencyImport(n, 'MRU');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 وحدة إدارة الموظفين</h1>
          <p className="page-subtitle">استعراض وتحديث بيانات الموظفين والعقود</p>
        </div>
      </div>

      <div className="grid-cols-2-1">
        {/* Left Column: List */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">قائمة الموظفين ({filtered.length})</h2>
            <div style={{ width: '220px' }}>
              <input
                type="text"
                placeholder="بحث بالاسم أو البريد أو المسمى..."
                className="form-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              />
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>المسمى الوظيفي</th>
                  <th>القسم</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => {
                  const dept = departments.find(d => d.department_id === emp.department_id);
                  return (
                    <tr
                      key={emp.employee_id}
                      onClick={() => handleSelect(emp)}
                      style={{ cursor: 'pointer', background: selectedEmp?.employee_id === emp.employee_id ? 'var(--bg-card-hover)' : '' }}
                      id={`emp-row-${emp.employee_id}`}
                    >
                      <td style={{ fontWeight: 700 }}>{emp.name || 'غير محدد'}</td>
                      <td>{emp.job_title || 'غير محدد'}</td>
                      <td>{dept?.name || 'غير محدد'}</td>
                      <td>
                        <span className={`badge ${emp.employment_status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                          {emp.employment_status === 'active' ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Details & Edit */}
        <div>
          {selectedEmp ? (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">🔍 تفاصيل الموظف</h2>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowProfileModal(true)}>
                    👤 الملف الكامل
                  </button>
                  {canManage && !editing && (
                    <button id="edit-emp-btn" className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                      ✏️ تعديل
                    </button>
                  )}
                </div>
              </div>

              {!editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div className="user-avatar" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
                      {selectedEmp.name?.[0] || 'N'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '16px' }}>{selectedEmp.name || 'غير محدد'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedEmp.job_title} | رقم: {selectedEmp.employee_id}</div>
                      {selectedEmp.email && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedEmp.email}</div>}
                    </div>
                  </div>

                  <div className="divider" style={{ margin: '8px 0' }} />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div className="form-label">الراتب الأساسي</div>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>{formatCurrency(selectedEmp.basic_salary)}</div>
                    </div>
                    <div>
                      <div className="form-label">البدلات</div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--success)' }}>+{formatCurrency(selectedEmp.allowances)}</div>
                    </div>
                    <div>
                      <div className="form-label">نوع الراتب</div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>
                        {selectedEmp.salary_type === 'hourly' ? '⏰ بالساعة' : '📅 شهري ثابت'}
                      </div>
                    </div>
                    {selectedEmp.salary_type === 'hourly' && (
                      <div>
                        <div className="form-label">سعر الساعة</div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--noxora-yellow-light)' }}>{formatCurrency(selectedEmp.hourly_rate)}/ساعة</div>
                      </div>
                    )}
                    <div>
                      <div className="form-label">تاريخ التعيين</div>
                      <div>{selectedEmp.hire_date || 'غير محدد'}</div>
                    </div>
                    <div>
                      <div className="form-label">نوع العقد</div>
                      <div>{selectedEmp.contract_type || 'غير محدد'}</div>
                    </div>
                    <div>
                      <div className="form-label">الجنسية</div>
                      <div>{selectedEmp.nationality || 'غير محدد'}</div>
                    </div>
                    <div>
                      <div className="form-label">الجنس</div>
                      <div>{selectedEmp.gender === 'male' ? 'ذكر' : selectedEmp.gender === 'female' ? 'أنثى' : 'غير محدد'}</div>
                    </div>
                    {selectedEmp.national_id && (
                      <div>
                        <div className="form-label">رقم الهوية الوطنية</div>
                        <div>{selectedEmp.national_id}</div>
                      </div>
                    )}
                    {selectedEmp.phone && (
                      <div>
                        <div className="form-label">الهاتف</div>
                        <div>{selectedEmp.phone}</div>
                      </div>
                    )}
                  </div>

                  <div className="divider" style={{ margin: '8px 0' }} />

                  {selectedEmp.address && (
                    <div>
                      <div className="form-label">العنوان</div>
                      <div style={{ fontSize: '13px' }}>{selectedEmp.address}</div>
                    </div>
                  )}

                  {selectedEmp.emergency_contact && (
                    <div>
                      <div className="form-label">جهة الاتصال في الطوارئ</div>
                      <div style={{ fontSize: '13px' }}>
                        📞 {selectedEmp.emergency_contact}
                        {selectedEmp.emergency_name && ` (${selectedEmp.emergency_name} - ${selectedEmp.emergency_relation})`}
                      </div>
                    </div>
                  )}

                  {selectedEmp.epi_score > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span className="form-label">مؤشر أداء الإنتاجية (EPI)</span>
                        <span style={{ fontWeight: 700, color: 'var(--success)' }}>{selectedEmp.epi_score}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill green" style={{ width: `${selectedEmp.epi_score}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Basic Info */}
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--noxora-yellow-light)', borderBottom: '1px solid var(--border-primary)', paddingBottom: '6px' }}>
                    📋 المعلومات الأساسية
                  </div>

                  <div className="form-group">
                    <label className="form-label">المسمى الوظيفي</label>
                    <input
                      id="edit-emp-job-title"
                      type="text"
                      className="form-input"
                      value={jobTitle}
                      onChange={e => setJobTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">القسم</label>
                    <select
                      id="edit-emp-dept"
                      className="form-select"
                      value={deptId}
                      onChange={e => setDeptId(e.target.value)}
                    >
                      <option value="">اختر القسم</option>
                      {departments.map(d => (
                        <option key={d.department_id} value={d.department_id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">حالة التعيين</label>
                    <select
                      id="edit-emp-status"
                      className="form-select"
                      value={empStatus}
                      onChange={e => setEmpStatus(e.target.value)}
                    >
                      <option value="active">نشط</option>
                      <option value="suspended">موقوف</option>
                    </select>
                  </div>

                  {/* Salary Info */}
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--noxora-yellow-light)', borderBottom: '1px solid var(--border-primary)', paddingBottom: '6px', marginTop: '8px' }}>
                    💰 معلومات الراتب
                  </div>

                  <div className="form-group">
                    <label className="form-label">نوع الراتب</label>
                    <select
                      id="edit-emp-salary-type"
                      className="form-select"
                      value={salaryType}
                      onChange={e => setSalaryType(e.target.value)}
                    >
                      <option value="monthly">📅 شهري ثابت</option>
                      <option value="hourly">⏰ بالساعة (حساب تلقائي)</option>
                    </select>
                  </div>
                  {salaryType === 'hourly' && (
                    <div className="form-group">
                      <label className="form-label">سعر الساعة (MRU)</label>
                      <input
                        id="edit-emp-hourly-rate"
                        type="number"
                        className="form-input"
                        value={hourlyRate}
                        onChange={e => setHourlyRate(e.target.value)}
                        placeholder="مثال: 30"
                        min="0.5"
                        step="0.5"
                        required
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">{salaryType === 'hourly' ? 'الحد الأقصى للساعات الشهرية' : 'الراتب الأساسي'}</label>
                    <input
                      id="edit-emp-basic-salary"
                      type="number"
                      className="form-input"
                      value={basicSalary}
                      onChange={e => setBasicSalary(e.target.value)}
                      min="0"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">البدلات</label>
                    <input
                      id="edit-emp-allowances"
                      type="number"
                      className="form-input"
                      value={allowances}
                      onChange={e => setAllowances(e.target.value)}
                      min="0"
                      required
                    />
                  </div>

                  {/* Contract Info */}
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--noxora-yellow-light)', borderBottom: '1px solid var(--border-primary)', paddingBottom: '6px', marginTop: '8px' }}>
                    📄 معلومات العقد
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">تاريخ التعيين</label>
                      <input
                        type="date"
                        className="form-input"
                        value={hireDate}
                        onChange={e => setHireDate(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">نوع العقد</label>
                      <select
                        className="form-select"
                        value={contractType}
                        onChange={e => setContractType(e.target.value)}
                      >
                        <option value="">غير محدد</option>
                        <option value="permanent">دائم</option>
                        <option value="contract">مؤقت</option>
                        <option value="probation">سنّة تجريبية</option>
                        <option value="part-time">دوام جزئي</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">الجنسية</label>
                      <input
                        type="text"
                        className="form-input"
                        value={nationality}
                        onChange={e => setNationality(e.target.value)}
                        placeholder="موريتاني..."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">الجنس</label>
                      <select
                        className="form-select"
                        value={gender}
                        onChange={e => setGender(e.target.value)}
                      >
                        <option value="">غير محدد</option>
                        <option value="male">ذكر</option>
                        <option value="female">أنثى</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">رقم الهوية الوطنية</label>
                    <input
                      type="text"
                      className="form-input"
                      value={nationalId}
                      onChange={e => setNationalId(e.target.value)}
                      placeholder="رقم الهوية..."
                    />
                  </div>

                  {/* Contact Info */}
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--noxora-yellow-light)', borderBottom: '1px solid var(--border-primary)', paddingBottom: '6px', marginTop: '8px' }}>
                    📞 معلومات الاتصال
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">الهاتف</label>
                      <input
                        type="text"
                        className="form-input"
                        value={empPhone}
                        onChange={e => setEmpPhone(e.target.value)}
                        placeholder="رقم الهاتف..."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">البريد الإلكتروني</label>
                      <input
                        type="email"
                        className="form-input"
                        value={empEmail}
                        onChange={e => setEmpEmail(e.target.value)}
                        placeholder="البريد..."
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">العنوان</label>
                    <input
                      type="text"
                      className="form-input"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="العنوان..."
                    />
                  </div>

                  {/* Emergency Contact */}
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--noxora-yellow-light)', borderBottom: '1px solid var(--border-primary)', paddingBottom: '6px', marginTop: '8px' }}>
                    🆘 جهات الاتصال في الطوارئ
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">رقم الطوارئ</label>
                      <input
                        type="text"
                        className="form-input"
                        value={emergencyContact}
                        onChange={e => setEmergencyContact(e.target.value)}
                        placeholder="رقم الاتصال..."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">اسم جهات الاتصال</label>
                      <input
                        type="text"
                        className="form-input"
                        value={emergencyName}
                        onChange={e => setEmergencyName(e.target.value)}
                        placeholder="الاسم..."
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">صلة القرابة</label>
                    <input
                      type="text"
                      className="form-input"
                      value={emergencyRelation}
                      onChange={e => setEmergencyRelation(e.target.value)}
                      placeholder="配偶، أب، أخ..."
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button id="save-emp-btn" type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                      {saving ? '⏳ جاري الحفظ...' : '💾 حفظ التعديلات'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>إلغاء</button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="card text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
              <span>👆</span>
              <p style={{ marginTop: '8px' }}>حدد موظفاً من القائمة لاستعراض تفاصيله أو تحديثها</p>
            </div>
          )}
        </div>
      </div>

      {showProfileModal && selectedEmp && (() => {
        const empUser = users.find(u => u.user_id === selectedEmp.user_id);
        const userRole = roles.find(r => r.role_id === empUser?.role_id);
        return (
          <UserProfileModal
            user={{
              user_id: selectedEmp.user_id,
              name: selectedEmp.name || selectedEmp.job_title,
              email: selectedEmp.email || '',
              phone: empUser?.phone || '',
              role_name: userRole?.role_name || empUser?.role_name || 'Employee',
              status: empUser?.status || 'active',
              employee_id: selectedEmp.employee_id,
              job_title: selectedEmp.job_title,
              department_name: departments.find(d => d.department_id === selectedEmp.department_id)?.name || '',
              basic_salary: selectedEmp.basic_salary,
              epi_score: selectedEmp.epi_score,
              national_id: selectedEmp.national_id,
              emergency_contact: selectedEmp.emergency_contact,
              emergency_name: selectedEmp.emergency_name
            }}
            currentUser={session}
            onClose={() => setShowProfileModal(false)}
            onUpdate={() => fetchData()}
          />
        );
      })()}
    </div>
  );
}
