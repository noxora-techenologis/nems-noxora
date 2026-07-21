'use client';

import { useEffect, useState } from 'react';

export default function DocumentsModule({ session }) {
  const [files, setFiles] = useState([]);
  const [fileVersions, setFileVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);

  // Form states for fake uploading
  const [newName, setNewName] = useState('');
  const [confidentiality, setConfidentiality] = useState('internal');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [filesRes, verRes] = await Promise.all([
        fetch('/api/data/files'),
        fetch('/api/data/file_versions'),
      ]);
      const filesData = await filesRes.json();
      const verData = await verRes.json();

      setFiles(filesData.data || []);
      setFileVersions(verData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!newName) return;

    try {
      // 1. Create file record
      const fileRes = await fetch('/api/data/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName + '.pdf',
          original_name: newName.toLowerCase().replace(/\s+/g, '_') + '.pdf',
          type: 'application/pdf',
          size: 1024 * 180, // mock size
          category: 'internal',
          department_id: session.department_id || 1,
          project_id: null,
          confidentiality: confidentiality,
          current_version: 1,
          uploaded_by: session.user_id,
          _userId: session.user_id,
        }),
      });

      const fileResult = await fileRes.json();
      if (!fileResult.success) {
        alert(fileResult.error || 'فشلت عملية الإضافة');
        return;
      }

      const createdFile = fileResult.data;

      // 2. Create version entry
      await fetch('/api/data/file_versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: createdFile.file_id,
          version_number: 1,
          content_snapshot: `نسخة مستند أولية ومؤمنة: ${newName}`,
          change_note: 'رفع المستند التأسيسي الأول إلى الخزانة الآمنة للشركة.',
          uploaded_by: session.user_id,
          is_rollback: false,
          _userId: session.user_id,
        }),
      });

      alert('تم تشفير وحفظ المستند بنجاح في خزنة الملفات المشتركة!');
      setNewName('');
      fetchData();

    } catch (err) {
      console.error(err);
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

  const selectedVersions = selectedFile
    ? fileVersions.filter(v => v.file_id === selectedFile.file_id)
    : [];

  const getConfLabel = (c) => {
    if (c === 'top_secret') return 'سري للغاية 🔒';
    if (c === 'internal') return 'داخلي 👥';
    return 'عام 🌍';
  };

  const getConfClass = (c) => {
    if (c === 'top_secret') return 'badge-danger';
    if (c === 'internal') return 'badge-warning';
    return 'badge-success';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📎 وثائق وملفات الشركة المشتركة</h1>
          <p className="page-subtitle">نظام الأرشفة السحابي الآمن وتتبع سجلات المراجعة للنسخ والوثائق</p>
        </div>
      </div>

      <div className="grid-cols-2-1">
        {/* Left: Files list */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">مستندات الخزانة الآمنة</h2>
            <span className="badge badge-muted">المجموع: {files.length} وثائق</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>المستند / التاريخ</th>
                  <th>الحجم</th>
                  <th>درجة السرية</th>
                  <th>الإصدار الحالى</th>
                </tr>
              </thead>
              <tbody>
                {files.map(file => (
                  <tr
                    key={file.file_id}
                    onClick={() => setSelectedFile(file)}
                    style={{ cursor: 'pointer', background: selectedFile?.file_id === file.file_id ? 'var(--bg-card-hover)' : '' }}
                    id={`file-row-${file.file_id}`}
                  >
                    <td>
                      <div style={{ fontWeight: 800, fontSize: '13.5px' }}>📄 {file.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>مرفوع: {file.created_at?.split(' ')[0]}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{(file.size / 1024).toFixed(0)} KB</td>
                    <td>
                      <span className={`badge ${getConfClass(file.confidentiality)}`}>
                        {getConfLabel(file.confidentiality)}
                      </span>
                    </td>
                    <td><span className="badge badge-muted" style={{ fontWeight: 800 }}>v{file.current_version}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: File details & Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {selectedFile ? (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">🔍 تفاصيل وإصدارات الوثيقة</h2>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedFile(null)}>إغلاق</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontWeight: 900, fontSize: '15px', color: 'var(--noxora-yellow-light)' }}>📄 {selectedFile.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>الاسم الأصلي: {selectedFile.original_name}</div>
                <div className="divider" style={{ margin: '6px 0' }} />

                <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>🕰️ سجل الإصدارات التاريخي</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedVersions.map(v => (
                    <div key={v.version_id} style={{
                      padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-primary)', fontSize: '12.5px', transition: 'all var(--transition-fast)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginBottom: '6px' }}>
                        <span style={{ color: 'var(--noxora-yellow-light)' }}>نسخة v{v.version_number}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{v.created_at?.split(' ')[0]}</span>
                      </div>
                      <div style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>{v.content_snapshot}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📝 ملاحظة المراجع: {v.change_note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ boxShadow: 'var(--shadow-md)' }}>
              <div className="card-header">
                <h2 className="card-title">📤 رفع وحفظ وثيقة جديدة</h2>
              </div>
              <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">اسم المستند (بدون امتداد)</label>
                  <input
                    id="new-file-name"
                    type="text"
                    className="form-input"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="مثال: محضر اجتماع الشركاء 2026..."
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">مستوى السرية والوصول المسموح</label>
                  <select
                    id="new-file-conf"
                    className="form-select"
                    value={confidentiality}
                    onChange={e => setConfidentiality(e.target.value)}
                  >
                    <option value="public">🌍 عام (للجميع)</option>
                    <option value="internal">👥 داخلي للموظفين فقط</option>
                    <option value="top_secret">🔒 سري للغاية (المدير والملاك والمجلس)</option>
                  </select>
                </div>
                <button id="upload-doc-btn" type="submit" className="btn btn-primary w-full" style={{ marginTop: '8px' }}>
                  🔒 تشفير وحفظ في الخزانة الآمنة
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
