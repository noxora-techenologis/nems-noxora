'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/format';

const STATUS_LABELS = {
  active: { label: 'نشط', class: 'badge-success' },
  planning: { label: 'تخطيط', class: 'badge-info' },
  completed: { label: 'مكتمل', class: 'badge-muted' },
  on_hold: { label: 'موقوف', class: 'badge-warning' },
};

const TASK_STATUS = {
  new: { label: 'جديد', class: 'badge-info' },
  in_progress: { label: 'جاري العمل', class: 'badge-warning' },
  completed: { label: 'مكتمل', class: 'badge-success' },
  on_hold: { label: 'موقوف', class: 'badge-muted' },
};

const PRIORITY_LABELS = {
  critical: { label: 'حرج 🚨', class: 'badge-danger' },
  high: { label: 'عالي 🔥', class: 'badge-warning' },
  medium: { label: 'متوسط ⚡', class: 'badge-info' },
  low: { label: 'منخفض 💤', class: 'badge-muted' },
};

export default function ProjectsModule({ session }) {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProj, setSelectedProj] = useState(null);
  const [, setCurrTick] = useState(0);

  useEffect(() => {
    const handleCurrChange = () => setCurrTick(t => t + 1);
    window.addEventListener('currency-change', handleCurrChange);
    return () => window.removeEventListener('currency-change', handleCurrChange);
  }, []);

  // New task form state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [requiredProof, setRequiredProof] = useState('none');
  const [deductionValue, setDeductionValue] = useState('');

  // Media attachment for video publishing tasks
  const [taskMediaType, setTaskMediaType] = useState('none');
  const [taskMediaUrl, setTaskMediaUrl] = useState('');

  // Proof modal states
  const [proofTask, setProofTask] = useState(null);
  const [proofInput, setProofInput] = useState('');
  const [proofFileType, setProofFileType] = useState('link');
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [recording, setRecording] = useState(false);

  const isEmployee = session.role_name.toLowerCase() === 'employee';
  const canManage = ['admin', 'ceo', 'pm'].includes(session.role_name.toLowerCase());
  const canCreateProject = session.role_name.toLowerCase() === 'ceo';

  // New project form state
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projPriority, setProjPriority] = useState('medium');
  const [projBudget, setProjBudget] = useState('');
  const [projStartDate, setProjStartDate] = useState('');
  const [projEndDate, setProjEndDate] = useState('');

  // Investment form state
  const [projBudgetTarget, setProjBudgetTarget] = useState('');
  const [projMinInvestment, setProjMinInvestment] = useState('');
  const [projIsInvestable, setProjIsInvestable] = useState(false);
  const [investAmount, setInvestAmount] = useState('');
  const [investors, setInvestors] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [closeProfit, setCloseProfit] = useState('');
  const [newProposalTitle, setNewProposalTitle] = useState('');
  const [newProposalDesc, setNewProposalDesc] = useState('');
  const [investTab, setInvestTab] = useState('investors');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, taskRes, empRes] = await Promise.all([
        fetch('/api/data/projects'),
        fetch('/api/data/tasks'),
        fetch('/api/data/employees'),
      ]);
      const projData = await projRes.json();
      const taskData = await taskRes.json();
      const empData = await empRes.json();

      setProjects(projData.data || []);
      setTasks(taskData.data || []);
      setEmployees(empData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = (proj) => {
    setSelectedProj(proj);
    setShowTaskForm(false);
    setShowProjectForm(false);
    setInvestTab('investors');
    if (proj) fetchInvestmentData(proj.project_id);
  };

  const fetchInvestmentData = async (projectId) => {
    try {
      const [invRes, propRes] = await Promise.all([
        fetch(`/api/projects/invest?projectId=${projectId}`),
        fetch(`/api/projects/proposals?projectId=${projectId}`),
      ]);
      const invData = await invRes.json();
      const propData = await propRes.json();
      setInvestors(invData.investments || []);
      setProposals(propData.proposals || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInvest = async () => {
    const amount = Number(investAmount);
    if (!amount || amount <= 0 || !selectedProj) return;
    if (!confirm(`هل تريد استثمار ${amount} MRU في مشروع "${selectedProj.name}"؟`)) return;

    try {
      const res = await fetch('/api/projects/invest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProj.project_id,
          userId: session.user_id,
          amount,
          owner_id: session.owner_id || null,
          employee_id: session.employee_id || null,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setInvestAmount('');
        fetchInvestmentData(selectedProj.project_id);
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleCloseProject = async () => {
    const profit = Number(closeProfit);
    if (!selectedProj) return;
    if (isNaN(profit)) {
      alert('يرجى إدخال صافي أرباح المشروع');
      return;
    }
    if (!confirm(`⚠️ إغلاق مشروع "${selectedProj.name}"\nصافي الأرباح: ${profit} MRU\n\n سيتم توزيع الأرباح:\n- 50% للشركة (${(profit * 0.5).toFixed(2)} MRU)\n- 50% للمستثمرين حسب نسبتهم\n\nهل أنت متأكد؟`)) return;

    try {
      const res = await fetch('/api/projects/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProj.project_id,
          profitAmount: profit,
          userId: session.user_id,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setCloseProfit('');
        fetchData();
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleCreateProposal = async () => {
    if (!newProposalTitle || !selectedProj) return;
    try {
      const res = await fetch('/api/projects/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          projectId: selectedProj.project_id,
          userId: session.user_id,
          title: newProposalTitle,
          description: newProposalDesc,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setNewProposalTitle('');
        setNewProposalDesc('');
        fetchInvestmentData(selectedProj.project_id);
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleVote = async (proposalId, choice) => {
    try {
      const res = await fetch('/api/projects/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vote',
          proposalId,
          userId: session.user_id,
          choice,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        fetchInvestmentData(selectedProj.project_id);
      } else {
        alert(result.error || 'فشلت العملية');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projName) {
      alert('يرجى إدخال اسم المشروع');
      return;
    }
    try {
      const res = await fetch('/api/data/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projName,
          description: projDesc,
          priority: projPriority,
          budget: Number(projBudget) || 0,
          start_date: projStartDate || null,
          end_date: projEndDate || null,
          status: 'planning',
          progress: 0,
          currency: 'MRU',
          health_score: 100,
          budget_target: Number(projBudgetTarget) || Number(projBudget) || 0,
          min_investment: Number(projMinInvestment) || 0,
          is_investable: projIsInvestable,
          _userId: session.user_id,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert('تم إنشاء المشروع بنجاح!');
        setProjName('');
        setProjDesc('');
        setProjPriority('medium');
        setProjBudget('');
        setProjStartDate('');
        setProjEndDate('');
        setShowProjectForm(false);
        fetchData();
      } else {
        alert(result.error || 'فشلت عملية الإضافة');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!selectedProj || !taskTitle || !assignedTo || !deadline) {
      alert('يرجى ملء كافة الحقول الأساسية');
      return;
    }

    try {
      const res = await fetch('/api/data/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProj.project_id,
          assigned_to: assignedTo,
          assigned_by: session.employee_id || 'EMP-001',
          title: taskTitle,
          description: taskDesc,
          priority: taskPriority,
          status: 'new',
          deadline: deadline,
          completion_percentage: 0,
          estimated_hours: 10,
          actual_hours: 0,
          required_proof: requiredProof,
          deduction_value: Number(deductionValue) || 0,
          attached_media: taskMediaType !== 'none' && taskMediaUrl ? { type: taskMediaType, url: taskMediaUrl } : null,
          _userId: session.user_id,
        }),
      });

      const result = await res.json();
      if (result.success) {
        alert('تم إسناد المهمة بنجاح وتعميمها!');
        setTaskTitle('');
        setTaskDesc('');
        setTaskPriority('medium');
        setAssignedTo('');
        setDeadline('');
        setRequiredProof('none');
        setDeductionValue('');
        setTaskMediaType('none');
        setTaskMediaUrl('');
        setShowTaskForm(false);
        fetchData();
      } else {
        alert(result.error || 'فشلت عملية الإضافة');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleUpdateTaskStatus = async (taskId, currentStatus) => {
    const nextStatusMap = {
      new: 'in_progress',
      in_progress: 'completed',
      completed: 'new',
    };
    const nextStatus = nextStatusMap[currentStatus] || 'new';

    const taskObj = tasks.find(t => t.task_id === taskId);
    if (nextStatus === 'completed' && taskObj && taskObj.required_proof && taskObj.required_proof !== 'none') {
      setProofTask(taskObj);
      setProofFileType(taskObj.required_proof);
      setProofInput('');
      setProofModalOpen(true);
      return;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updateData = {
      _id: taskId,
      _userId: session.user_id,
      status: nextStatus,
      completion_percentage: nextStatus === 'completed' ? 100 : 50,
    };

    if (nextStatus === 'completed') {
      updateData.completed_at = nowStr;
      if (taskObj?.deadline && new Date(nowStr) > new Date(taskObj.deadline)) {
        updateData.is_delayed = true;
      }
    }

    try {
      const res = await fetch('/api/data/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const result = await res.json();
      if (result.success) {
        fetchData();
      } else {
        alert(result.error || 'فشل تحديث حالة المهمة');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!proofTask || !proofInput) {
      alert('يرجى تقديم الإثبات المطلوب لإنهاء المهمة');
      return;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updateData = {
      _id: proofTask.task_id,
      _userId: session.user_id,
      status: 'completed',
      completion_percentage: 100,
      completed_at: nowStr,
      proof_submitted: { type: proofFileType, value: proofInput }
    };

    if (proofTask.deadline && new Date(nowStr) > new Date(proofTask.deadline)) {
      updateData.is_delayed = true;
    }

    try {
      const res = await fetch('/api/data/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const result = await res.json();
      if (result.success) {
        alert('تم تقديم الإثبات واعتماد إنهاء المهمة!');
        setProofModalOpen(false);
        setProofTask(null);
        setProofInput('');
        fetchData();
      } else {
        alert(result.error || 'فشلت العملية');
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

  const projectTasks = selectedProj
    ? tasks.filter(t => t.project_id === selectedProj.project_id)
    : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📂 المشاريع والمهام البرمجية</h1>
          <p className="page-subtitle">نظام تتبع خطوط العمل، توزيع المهام، وتقدير سرعة الإنجاز الكلية</p>
        </div>
      </div>

      <div className="grid-cols-2-1">
        {/* Left Column: Projects list */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">سير المشاريع القائمة</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="badge badge-muted">المجموع: {projects.length} مشاريع</span>
              {canCreateProject && (
                <button
                  id="add-project-btn"
                  className="btn btn-primary btn-sm"
                  onClick={() => { setShowProjectForm(!showProjectForm); setShowTaskForm(false); setSelectedProj(null); }}
                >
                  {showProjectForm ? '✕ إلغاء' : '➕ مشروع جديد'}
                </button>
              )}
            </div>
          </div>

          {/* Project Creation Form (CEO only) */}
          {showProjectForm && canCreateProject && (
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-primary)', background: 'rgba(192,57,43,0.04)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', color: 'var(--noxora-red)' }}>➕ إنشاء مشروع جديد</h3>
              <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">اسم المشروع *</label>
                  <input
                    id="new-proj-name"
                    type="text"
                    className="form-input"
                    value={projName}
                    onChange={e => setProjName(e.target.value)}
                    required
                    placeholder="مثال: تطوير تطبيق NEMS"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">وصف المشروع</label>
                  <textarea
                    id="new-proj-desc"
                    className="form-textarea"
                    value={projDesc}
                    onChange={e => setProjDesc(e.target.value)}
                    placeholder="وصف مختصر لأهداف المشروع..."
                    style={{ minHeight: '60px' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">الأولوية</label>
                    <select id="new-proj-priority" className="form-select" value={projPriority} onChange={e => setProjPriority(e.target.value)}>
                      <option value="low">منخفضة</option>
                      <option value="medium">متوسطة</option>
                      <option value="high">عالية</option>
                      <option value="critical">حرجة</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">الميزانية (MRU)</label>
                    <input id="new-proj-budget" type="number" className="form-input" value={projBudget} onChange={e => setProjBudget(e.target.value)} placeholder="0" min="0" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">تاريخ البداية</label>
                    <input id="new-proj-start" type="date" className="form-input" value={projStartDate} onChange={e => setProjStartDate(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">تاريخ النهاية</label>
                    <input id="new-proj-end" type="date" className="form-input" value={projEndDate} onChange={e => setProjEndDate(e.target.value)} />
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-accent)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>
                    <input type="checkbox" checked={projIsInvestable} onChange={e => setProjIsInvestable(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                    📈 متاح للاستثمار (يظهر للملاك والموظفين)
                  </label>
                  {projIsInvestable && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">الميزانية المستهدفة (MRU)</label>
                        <input type="number" className="form-input" value={projBudgetTarget} onChange={e => setProjBudgetTarget(e.target.value)} placeholder="0" min="0" />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">الحد الأدنى للاستثمار (MRU)</label>
                        <input type="number" className="form-input" value={projMinInvestment} onChange={e => setProjMinInvestment(e.target.value)} placeholder="0" min="0" />
                      </div>
                    </div>
                  )}
                </div>
                <button id="submit-project-btn" type="submit" className="btn btn-primary btn-sm w-full">🚀 إنشاء المشروع</button>
              </form>
            </div>
          )}

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>المشروع</th>
                  <th>الأولوية</th>
                  <th>التقدم</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => {
                  const statusInfo = STATUS_LABELS[p.status] || { label: p.status, class: 'badge-muted' };
                  const priorityInfo = PRIORITY_LABELS[p.priority] || { label: p.priority, class: 'badge-muted' };
                  return (
                    <tr
                      key={p.project_id}
                      onClick={() => handleSelectProject(p)}
                      style={{ cursor: 'pointer', background: selectedProj?.project_id === p.project_id ? 'var(--bg-card-hover)' : '' }}
                      id={`project-row-${p.project_id}`}
                    >
                      <td>
                        <div style={{ fontWeight: 800, fontSize: '14px' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.project_id}</div>
                      </td>
                      <td><span className={`badge ${priorityInfo.class}`}>{priorityInfo.label}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="progress-bar" style={{ width: '70px' }}>
                            <div className="progress-fill green" style={{ width: `${p.progress}%` }} />
                          </div>
                          <span style={{ fontSize: '11.5px', fontWeight: 800 }}>{p.progress}%</span>
                        </div>
                      </td>
                      <td><span className={`badge ${statusInfo.class}`}>{statusInfo.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Project Tasks & Actions */}
        <div>
          {selectedProj ? (
            <div className="card">
              <div className="card-header" style={{ alignItems: 'flex-start' }}>
                <div>
                  <h2 className="card-title" style={{ fontSize: '17px', color: 'var(--noxora-yellow-light)' }}>{selectedProj.name}</h2>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    الميزانية: {formatCurrency(selectedProj.budget, selectedProj.currency)} · مؤشر الصحة: {selectedProj.health_score}%
                    {selectedProj.is_investable && (
                      <span style={{ marginRight: '12px', color: 'var(--info)', fontWeight: 700 }}>
                        📈 استثماري — المستهدف: {formatCurrency(selectedProj.budget_target)} · المُستثمَر: {formatCurrency(selectedProj.total_invested)}
                      </span>
                    )}
                    {selectedProj.profit_amount > 0 && (
                      <span style={{ marginRight: '12px', color: 'var(--success)', fontWeight: 700 }}>
                        💰 أرباح: {formatCurrency(selectedProj.profit_amount)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {canManage && !showTaskForm && (
                    <button id="add-task-modal-btn" className="btn btn-primary btn-sm" onClick={() => setShowTaskForm(true)}>
                      ➕ إسناد مهمة
                    </button>
                  )}
                </div>
              </div>

              <div className="divider" style={{ margin: '14px 0' }} />

              {!showTaskForm ? (
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '14px' }}>
                    قائمة المهام ({projectTasks.length})
                  </h3>
                  {projectTasks.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      💤 لا توجد مهام مسندة حالياً لهذا المشروع
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {projectTasks.map(t => {
                        const statusInfo = TASK_STATUS[t.status] || { label: t.status, class: 'badge-muted' };
                        const priorityInfo = PRIORITY_LABELS[t.priority] || { label: t.priority, class: 'badge-muted' };
                        const isAssignedToMe = isEmployee && t.assigned_to === session.employee_id;

                        return (
                          <div key={t.task_id} id={`task-${t.task_id}`} style={{
                            padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '14px',
                            transition: 'all var(--transition-base)'
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 800, fontSize: '13.5px', marginBottom: '4px', color: 'var(--text-primary)' }}>{t.title}</div>
                              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.4 }}>{t.description}</p>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span className={`badge ${statusInfo.class}`}>{statusInfo.label}</span>
                                <span className={`badge ${priorityInfo.class}`}>{priorityInfo.label}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📅 تسليم: {t.deadline}</span>
                                <span style={{ fontSize: '11px', color: 'var(--noxora-yellow-light)', fontWeight: 700 }}>👤 {t.assigned_to}</span>
                                {t.required_proof && t.required_proof !== 'none' && (
                                  <span className="badge badge-warning" style={{ fontSize: '10px' }}>
                                    🔒 إثبات: {t.required_proof === 'link' ? 'رابط' : t.required_proof === 'image' ? 'صورة' : t.required_proof === 'video' ? 'فيديو' : 'صوت'}
                                  </span>
                                )}
                                {t.deduction_value > 0 && (
                                  <span className="badge badge-danger" style={{ fontSize: '10px' }}>
                                    💸 خصم: {t.deduction_value} MRU
                                  </span>
                                )}
                                {t.is_delayed && (
                                  <span className="badge badge-danger" style={{ fontSize: '10px' }}>⏰ متأخر</span>
              )}
            </div>

            {/* Investment & Governance Section (for investable projects) */}
            {selectedProj.is_investable && selectedProj.status !== 'completed' && selectedProj.status !== 'closed' && (
              <div className="card" style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px', flexWrap: 'wrap' }}>
                  <button className={`btn ${investTab === 'investors' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setInvestTab('investors')}>
                    📊 المستثمرون ({investors.length})
                  </button>
                  <button className={`btn ${investTab === 'propose' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setInvestTab('propose')}>
                    💡 مقترحات ({proposals.length})
                  </button>
                  {canCreateProject && (
                    <button className={`btn ${investTab === 'close' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setInvestTab('close')}>
                      🔒 إغلاق المشروع
                    </button>
                  )}
                </div>

                {/* Investors Tab */}
                {investTab === 'investors' && (
                  <div>
                    {/* Invest Form */}
                    <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid var(--border-accent)' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '10px', color: 'var(--info)' }}>📈 استثمار في هذا المشروع</h3>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ margin: 0, flex: 1 }}>
                          <label className="form-label">المبلغ (MRU) — الحد الأدنى: {formatCurrency(selectedProj.min_investment)}</label>
                          <input type="number" className="form-input" value={investAmount} onChange={e => setInvestAmount(e.target.value)} placeholder="أدخل المبلغ..." min={selectedProj.min_investment || 1} />
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={handleInvest} style={{ height: '40px' }}>💰 استثمار</button>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        سيتم خصم المبلغ من محفظتك مباشرة. الميزانية المستهدفة: {formatCurrency(selectedProj.budget_target)} | المُستثمَر حالياً: {formatCurrency(selectedProj.total_invested)}
                      </div>
                    </div>

                    {/* Investors List */}
                    {investors.length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>لا يوجد مستثمرون بعد</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {investors.map(inv => (
                          <div key={inv.investment_id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px', borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                          }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '13px' }}>{inv.user_name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {new Date(inv.invested_at).toLocaleDateString('ar-SA')}
                              </div>
                            </div>
                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--info)' }}>{formatCurrency(inv.amount)}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{inv.investment_percentage?.toFixed(2)}% من المشروع</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Proposals Tab */}
                {investTab === 'propose' && (
                  <div>
                    {/* New Proposal Form */}
                    <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px dashed var(--border-accent)' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '10px' }}>💡 اقتراح جديد</h3>
                      <div className="form-group">
                        <input type="text" className="form-input" value={newProposalTitle} onChange={e => setNewProposalTitle(e.target.value)} placeholder="عنوان المقترح..." />
                      </div>
                      <div className="form-group">
                        <textarea className="form-textarea" value={newProposalDesc} onChange={e => setNewProposalDesc(e.target.value)} placeholder="تفاصيل المقترح والاقتراحات..." style={{ minHeight: '60px' }} />
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={handleCreateProposal}>📤 نشر المقترح</button>
                    </div>

                    {/* Proposals List */}
                    {proposals.length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد مقترحات بعد</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {proposals.map(prop => (
                          <div key={prop.proposal_id} style={{
                            padding: '16px', borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-secondary)', border: `1px solid ${prop.passed ? 'var(--success)' : 'var(--border-primary)'}`,
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '14px' }}>{prop.title}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  بواسطة: #{prop.user_id} — {new Date(prop.created_at).toLocaleDateString('ar-SA')}
                                </div>
                              </div>
                              <span className={`badge ${prop.passed ? 'badge-success' : 'badge-warning'}`}>
                                {prop.passed ? '✅ مقبول' : '⏳ قيد التصويت'}
                              </span>
                            </div>
                            {prop.description && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>{prop.description}</p>}
                            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', marginBottom: '10px' }}>
                              <span style={{ color: 'var(--success)' }}>👍 موافق: {prop.approve_count} ({prop.approve_weight?.toFixed(1)}%)</span>
                              <span style={{ color: 'var(--danger)' }}>👎 معترض: {prop.object_count} ({prop.object_weight?.toFixed(1)}%)</span>
                            </div>
                            {/* Vote Buttons */}
                            {!prop.votes?.some(v => v.user_id === session.user_id) && (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', borderColor: 'var(--success)' }} onClick={() => handleVote(prop.proposal_id, 'approve')}>
                                  👍 موافق
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleVote(prop.proposal_id, 'object')}>
                                  👎 معترض
                                </button>
                              </div>
                            )}
                            {prop.votes?.some(v => v.user_id === session.user_id) && (
                              <div style={{ fontSize: '11px', color: 'var(--info)', fontWeight: 700 }}>✓ لقد تصويت مسبقاً</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Close Project Tab (CEO only) */}
                {investTab === 'close' && canCreateProject && (
                  <div style={{ padding: '16px', background: 'rgba(192,57,43,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(192,57,43,0.2)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--danger)', marginBottom: '12px' }}>🔒 إغلاق المشروع وتوزيع الأرباح</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
                      عند الإغلاق، سيتم تقسيم الأرباح تلقائياً:<br />
                      • <strong>50%</strong> للشركة (ترتفع القيمة السوقية)<br />
                      • <strong>50%</strong> للمستثمرين حسب نسبة مساهمتهم المالية
                    </p>
                    <div className="form-group">
                      <label className="form-label">صافي أرباح المشروع (MRU)</label>
                      <input type="number" className="form-input" value={closeProfit} onChange={e => setCloseProfit(e.target.value)} placeholder="0" min="0" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '12px 0', fontSize: '13px' }}>
                      <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>حصة الشركة (50%)</div>
                        <div style={{ fontWeight: 800, color: 'var(--success)' }}>{formatCurrency((Number(closeProfit) || 0) * 0.5)}</div>
                      </div>
                      <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>حصة المستثمرين (50%)</div>
                        <div style={{ fontWeight: 800, color: 'var(--info)' }}>{formatCurrency((Number(closeProfit) || 0) * 0.5)}</div>
                      </div>
                    </div>
                    <button className="btn btn-danger" onClick={handleCloseProject}>🔒 إغلاق المشروع وتوزيع الأرباح</button>
                  </div>
                )}
              </div>
            )}

                              {/* Attached Media for Employees (Videos / Content to Publish) */}
                              {t.attached_media && t.attached_media.url && (
                                <div style={{
                                  marginTop: '10px', padding: '12px',
                                  background: 'linear-gradient(135deg, rgba(192,57,43,0.12), rgba(243,156,18,0.08))',
                                  borderRadius: 'var(--radius-md)', border: '1px solid rgba(243,156,18,0.3)', fontSize: '12px'
                                }}>
                                  <div style={{ fontWeight: 800, color: 'var(--noxora-yellow-light)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>🎬 الملف/الفيديو المرفق للمهمة بالنشر والمونتاج:</span>
                                  </div>
                                  {t.attached_media.type === 'video' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <video
                                        src={t.attached_media.url}
                                        controls
                                        style={{ width: '100%', maxHeight: '200px', borderRadius: 'var(--radius-sm)', background: '#000' }}
                                      />
                                      <a
                                        href={t.attached_media.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-secondary btn-sm"
                                        style={{ alignSelf: 'flex-start', fontSize: '11px', gap: '6px' }}
                                      >
                                        ⬇️ فتح/تنزيل الفيديو الأصلي للنشر
                                      </a>
                                    </div>
                                  ) : (
                                    <a
                                      href={t.attached_media.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: 'var(--noxora-yellow-light)', textDecoration: 'underline', wordBreak: 'break-all', fontWeight: 700 }}
                                    >
                                      🔗 {t.attached_media.url}
                                    </a>
                                  )}
                                </div>
                              )}

                              {t.status === 'completed' && t.proof_submitted && (
                                <div style={{
                                  marginTop: '10px', padding: '10px',
                                  background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-primary)', fontSize: '12px'
                                }}>
                                  <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: '4px' }}>
                                    ✓ دليل الإنجاز المرفق:
                                  </div>
                                  {t.proof_submitted.type === 'link' && (
                                    <a href={t.proof_submitted.value} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--noxora-yellow-light)', textDecoration: 'underline', wordBreak: 'break-all' }}>
                                      🔗 {t.proof_submitted.value}
                                    </a>
                                  )}
                                  {t.proof_submitted.type === 'image' && (
                                    <div style={{ maxHeight: '100px', width: '200px', overflow: 'hidden', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', marginTop: '4px' }}>
                                      <img src={t.proof_submitted.value} alt="دليل إنجاز المهمة" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </div>
                                  )}
                                  {t.proof_submitted.type === 'video' && (
                                    <div style={{ color: 'var(--noxora-yellow-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>🎥 مقطع فيديو توضيحي مرفق</span>
                                    </div>
                                  )}
                                  {t.proof_submitted.type === 'audio' && (
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px', color: 'var(--success)' }}>
                                      <span>🔊 بصمة صوتية توضيحية مرفقة</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            {(canManage || isAssignedToMe) && t.status !== 'completed' && (
                              <button
                                id={`update-status-${t.task_id}`}
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleUpdateTaskStatus(t.task_id, t.status)}
                                title="تحديث حالة المهمة للمرحلة التالية"
                              >
                                🔄 تحديث
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '10px' }}>➕ إضافة مهمة جديدة</h3>
                  <div className="form-group">
                    <label className="form-label">عنوان المهمة</label>
                    <input
                      id="new-task-title"
                      type="text"
                      className="form-input"
                      value={taskTitle}
                      onChange={e => setTaskTitle(e.target.value)}
                      required
                      placeholder="تصميم أو برمجة..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">تفاصيل المهمة</label>
                    <textarea
                      id="new-task-desc"
                      className="form-textarea"
                      value={taskDesc}
                      onChange={e => setTaskDesc(e.target.value)}
                      placeholder="اكتب هنا جميع متطلبات إنجاز المهمة..."
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">الأولوية</label>
                      <select
                        id="new-task-priority"
                        className="form-select"
                        value={taskPriority}
                        onChange={e => setTaskPriority(e.target.value)}
                      >
                        <option value="low">منخفضة</option>
                        <option value="medium">متوسطة</option>
                        <option value="high">عالية</option>
                        <option value="critical">حرجة 🚨</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">الموظف المسؤول</label>
                      <select
                        id="new-task-assignee"
                        className="form-select"
                        value={assignedTo}
                        onChange={e => setAssignedTo(e.target.value)}
                        required
                      >
                        <option value="">اختر من القائمة...</option>
                        {employees.map(e => (
                          <option key={e.employee_id} value={e.employee_id}>
                            {e.employee_id} - {e.job_title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">تاريخ الاستحقاق والتسليم</label>
                    <input
                      id="new-task-deadline"
                      type="date"
                      className="form-input"
                      value={deadline}
                      onChange={e => setDeadline(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">التحقق المطلوب لإنهاء المهمة (دليل الإنجاز)</label>
                    <select
                      id="new-task-proof"
                      className="form-select"
                      value={requiredProof}
                      onChange={e => setRequiredProof(e.target.value)}
                    >
                      <option value="none">لا يوجد إثبات إلزامي (مباشر)</option>
                      <option value="link">رابط نشر المهمة (مثل TikTok / YouTube Link)</option>
                      <option value="image">صورة أو لقطة شاشة كدليل إنجاز</option>
                      <option value="video">مقطع فيديو توضيحي كدليل إنجاز</option>
                      <option value="audio">بصمة صوتية توضيحية لإنجاز العمل</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">قيمة الخصم عند عدم إنجاز المهمة (MRU)</label>
                    <input
                      id="new-task-deduction"
                      type="number"
                      className="form-input"
                      value={deductionValue}
                      onChange={e => setDeductionValue(e.target.value)}
                      placeholder="0 = لا يوجد خصم"
                      min="0"
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      سيتم خصم هذه المبلغ من راتب الموظف إذا لم يُنجز المهمة قبل نهاية الشهر
                    </div>
                  </div>
                  <div className="form-group" style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-accent)' }}>
                    <label className="form-label" style={{ color: 'var(--noxora-yellow-light)' }}>🎥 إرفاق ملف/فيديو للنشر والمونتاج للموظف (اختياري)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                      <select
                        id="new-task-media-type"
                        className="form-select"
                        value={taskMediaType}
                        onChange={e => setTaskMediaType(e.target.value)}
                      >
                        <option value="none">بدون مرفق إعلامي</option>
                        <option value="video">🎬 فيديو مجهز للنشر</option>
                        <option value="link">🔗 رابط ملف الفيديو / السحابة</option>
                        <option value="image">🖼️ صورة تصاميم للنشر</option>
                      </select>
                      {taskMediaType !== 'none' && (
                        <input
                          id="new-task-media-url"
                          type="url"
                          className="form-input"
                          value={taskMediaUrl}
                          onChange={e => setTaskMediaUrl(e.target.value)}
                          placeholder="ضع رابط الفيديو أو الملف هنا (URL)..."
                          required
                        />
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button id="save-task-btn" type="submit" className="btn btn-primary" style={{ flex: 1 }}>إرسال وتعيين المهمة</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowTaskForm(false)}>إلغاء</button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="card text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
              <span>📂</span>
              <p style={{ marginTop: '8px' }}>حدد مشروعاً من قائمة المشاريع لاستعراض قائمة مهامه وإدارتها</p>
            </div>
          )}
        </div>
      </div>

      {/* Proof Submission Modal */}
      {proofModalOpen && proofTask && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="card animate-scaleUp" style={{ maxWidth: '500px', width: '100%', boxShadow: 'var(--shadow-lg)', border: '1px solid rgba(243, 156, 18, 0.3)' }}>
            <div className="card-header" style={{ marginBottom: '14px' }}>
              <h2 className="card-title" style={{ fontSize: '18px', color: 'var(--noxora-yellow-light)' }}>📋 متطلبات إثبات إنجاز العمل</h2>
            </div>
            
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
              يرجى تقديم الإثبات المطلوب من مدير المشروع لتأكيد إنهاء المهمة:
              <br />
              <strong style={{ color: 'var(--text-primary)' }}>{proofTask.title}</strong>
            </p>

            <form onSubmit={handleSubmitProof} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {proofFileType === 'link' && (
                <div className="form-group">
                  <label className="form-label">رابط تسليم المهمة (Figma / GitHub / Staging URL)</label>
                  <input
                    id="proof-link-input"
                    type="url"
                    className="form-input"
                    value={proofInput}
                    onChange={e => setProofInput(e.target.value)}
                    placeholder="https://github.com/..."
                    required
                  />
                </div>
              )}

              {proofFileType === 'image' && (
                <div className="form-group">
                  <label className="form-label">قم برفع لقطة شاشة كإثبات (صورة)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', textAlign: 'center' }}>
                      📸 اختر صورة الدليل
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            const r = new FileReader();
                            r.onloadend = () => setProofInput(r.result);
                            r.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    {proofInput && (
                      <div style={{ height: '120px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                        <img src={proofInput} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {proofFileType === 'video' && (
                <div className="form-group">
                  <label className="form-label">قم برفع فيديو توضيحي (فيديو)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', textAlign: 'center' }}>
                      🎥 اختر ملف الفيديو
                      <input
                        type="file"
                        accept="video/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            setProofInput(`data:video/mp4;base64,MockVideoBase64String_${file.name}`);
                          }
                        }}
                      />
                    </label>
                    {proofInput && (
                      <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '12px', border: '1px solid var(--success)' }}>
                        ✅ تم اختيار الفيديو بنجاح!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {proofFileType === 'audio' && (
                <div className="form-group">
                  <label className="form-label">التسجيل الصوتي التوضيحي (بصمة صوتية)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-primary)' }}>
                    <div style={{ fontSize: '32px' }}>{recording ? '🎙️🔴' : '🎤'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {recording ? 'جاري تسجيل التوضيح الصوتي...' : 'انقر على الزر لتسجيل شرح صوتي مدته 30 ثانية'}
                    </div>
                    <button
                      type="button"
                      className={`btn ${recording ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                      onClick={() => {
                        if (!recording) {
                          setRecording(true);
                          setTimeout(() => {
                            setRecording(false);
                            setProofInput('data:audio/mp3;base64,MockAudioBase64String_Recording');
                            alert('تم حفظ التسجيل الصوتي المكتمل!');
                          }, 3000);
                        }
                      }}
                    >
                      {recording ? '⏹️ إيقاف وحفظ' : '⏺️ بدء التسجيل'}
                    </button>
                    {proofInput && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--success)', fontSize: '13px' }}>
                        <span>🔊 تم حفظ الملف الصوتي المرفق</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <button id="submit-proof-btn" type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={!proofInput}>
                  🚀 تقديم الإثبات وإنجاز المهمة
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => { setProofModalOpen(false); setProofTask(null); }}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
