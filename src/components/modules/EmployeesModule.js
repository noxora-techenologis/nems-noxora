'use client';

import { useEffect, useState } from 'react';
import { formatCurrency as formatCurrencyImport } from '@/lib/format';

import UserProfileModal from '@/components/UserProfileModal';

export default function EmployeesModule({ session }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
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

  const canManage = ['admin', 'ceo', 'hr'].includes(session.role_name.toLowerCase());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, deptRes] = await Promise.all([
        fetch('/api/data/employees'),
        fetch('/api/data/departments'),
      ]);
      const empData = await empRes.json();
      const deptData = await deptRes.json();
      setEmployees(empData.data || []);
      setDepartments(deptData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (emp) => {
    setSelectedEmp(emp);
    setJobTitle(emp.job_title || '');
    setBasicSalary(emp.basic_salary || '');
    setAllowances(emp.allowances || '');
    setEmpStatus(emp.employment_status || 'active');
    setEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedEmp) return;

    try {
      const res = await fetch('/api/data/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: selectedEmp.employee_id,
          _userId: session.user_id,
          job_title: jobTitle,
          basic_salary: Number(basicSalary),
          allowances: Number(allowances),
          employment_status: empStatus,
        }),
      });

      const result = await res.json();
      if (result.success) {
        // Update local state
        setEmployees(employees.map(emp =>
          emp.employee_id === selectedEmp.employee_id
            ? { ...emp, job_title: jobTitle, basic_salary: Number(basicSalary), allowances: Number(allowances), employment_status: empStatus }
            : emp
        ));
        setSelectedEmp({ ...selectedEmp, job_title: jobTitle, basic_salary: Number(basicSalary), allowances: Number(allowances), employment_status: empStatus });
        setEditing(false);
        alert('تم حفظ التعديلات بنجاح!');
      } else {
        alert(result.error || 'فشلت عملية الحفظ');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const filtered = employees.filter(emp =>
    (emp.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (emp.job_title || '').toLowerCase().includes(search.toLowerCase()) ||
    (emp.employee_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (emp.nationality || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="animate-spin" style={{ fontSize: '32px' }}>⟳</div>
      </div>
    );
  }

  // Format using NEMS unified formatter (enforces Ghubariya numerals and MRU currency)
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
                placeholder="بحث بالاسم أو المسمى..."
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
                      <div className="form-label">تاريخ التعيين</div>
                      <div>{selectedEmp.hire_date}</div>
                    </div>
                    <div>
                      <div className="form-label">نوع العقد</div>
                      <div>{selectedEmp.contract_type}</div>
                    </div>
                    <div>
                      <div className="form-label">الجنسية</div>
                      <div>{selectedEmp.nationality}</div>
                    </div>
                    <div>
                      <div className="form-label">الجنس</div>
                      <div>{selectedEmp.gender === 'male' ? 'ذكر' : 'أنثى'}</div>
                    </div>
                  </div>

                  <div className="divider" style={{ margin: '8px 0' }} />

                  <div>
                    <div className="form-label">العنوان</div>
                    <div style={{ fontSize: '13px' }}>{selectedEmp.address}</div>
                  </div>

                  <div>
                    <div className="form-label">جهة الاتصال في الطوارئ</div>
                    <div style={{ fontSize: '13px' }}>
                      📞 {selectedEmp.emergency_contact}
                      {selectedEmp.emergency_name && ` (${selectedEmp.emergency_name} - ${selectedEmp.emergency_relation})`}
                    </div>
                  </div>

                  {selectedEmp.epi_score && (
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
                    <label className="form-label">الراتب الأساسي</label>
                    <input
                      id="edit-emp-basic-salary"
                      type="number"
                      className="form-input"
                      value={basicSalary}
                      onChange={e => setBasicSalary(e.target.value)}
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
                      required
                    />
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
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button id="save-emp-btn" type="submit" className="btn btn-primary" style={{ flex: 1 }}>حفظ التعديلات</button>
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

      {showProfileModal && selectedEmp && (
        <UserProfileModal
          user={{
            user_id: selectedEmp.user_id,
            name: selectedEmp.name || selectedEmp.job_title,
            email: selectedEmp.email || '',
            phone: selectedEmp.emergency_contact,
            role_name: 'Employee',
            employee_id: selectedEmp.employee_id,
            job_title: selectedEmp.job_title,
            basic_salary: selectedEmp.basic_salary,
            epi_score: selectedEmp.epi_score,
            national_id: selectedEmp.national_id,
            emergency_contact: selectedEmp.emergency_contact,
            emergency_name: selectedEmp.emergency_name
          }}
          currentUser={session}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
}
