import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from './Toast';
import ConfirmModal from './ConfirmModal';

interface ClassMember {
  _id: string;
  name: string;
  email: string;
}

interface ClassItem {
  _id: string;
  name: string;
  code: string;
  students: ClassMember[];
  createdAt: string;
}

interface ClassManagerProps {
  axiosConfig: object;
}

const ClassManager: React.FC<ClassManagerProps> = ({ axiosConfig }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => { fetchClasses(); }, []);

  const fetchClasses = async () => {
    try {
      const res = await axios.get('https://ai-eval-74ay.onrender.com/api/my-classes', axiosConfig);
      setClasses(res.data.classes);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to load classes';
      toast.error(msg);
    }
  };

  const createClass = async () => {
    if (!newClassName.trim()) return;
    setCreating(true);
    try {
      const res = await axios.post('https://ai-eval-74ay.onrender.com/api/create-class', { name: newClassName }, axiosConfig);
      setClasses(prev => [...prev, res.data.class]);
      setNewClassName('');
      toast.success(`Class created! Code: ${res.data.class.code}`);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to create class';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const deleteClass = async (classId: string) => {
    try {
      await axios.delete(`https://ai-eval-74ay.onrender.com/api/delete-class/${classId}`, axiosConfig);
      setClasses(prev => prev.filter(c => c._id !== classId));
      toast.success('Class deleted');
    } catch {
      toast.error('Failed to delete class');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.info('Code copied to clipboard');
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">My Classes</h2>
        <span className="count-badge">{classes.length}</span>
      </div>

      {/* Create Class */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <input
          className="form-input"
          placeholder="Class name (e.g. Physics Batch A)"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createClass()}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" onClick={createClass} disabled={!newClassName.trim() || creating}>
          {creating ? <span className="loading"><span className="spinner" />Creating...</span> : 'Create Class'}
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏫</div>
          <p>No classes yet. Create one to get started.</p>
        </div>
      ) : (
        classes.map((cls) => (
          <div key={cls._id} className="paper-item">
            <div className="paper-header">
              <div style={{ flex: 1 }}>
                <h3 className="paper-title">{cls.name}</h3>
                <div className="paper-meta">
                  {new Date(cls.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  {' · '}{cls.students.length} student{cls.students.length !== 1 ? 's' : ''}
                </div>

                {/* Join Code */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.6rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Join Code</span>
                  <div className="class-code-badge">
                    <span className="class-code-text">{cls.code}</span>
                    <button className="class-code-copy" onClick={() => copyCode(cls.code)}>
                      {copiedCode === cls.code ? '✓' : '⧉'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="paper-actions">
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem' }}
                  onClick={() => setExpandedClass(expandedClass === cls._id ? null : cls._id)}
                >
                  {expandedClass === cls._id ? 'Hide Members' : `Members (${cls.students.length})`}
                </button>
                <button className="btn btn-danger" onClick={() => setConfirmDelete(cls._id)}>Delete</button>
              </div>
            </div>

            {/* Members List */}
            {expandedClass === cls._id && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                {cls.students.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
                    No students have joined yet. Share the code <strong style={{ color: 'var(--text-2)' }}>{cls.code}</strong> with your students.
                  </p>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Name</th>
                          <th>Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cls.students.map((s, i) => (
                          <tr key={s._id}>
                            <td style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{i + 1}</td>
                            <td style={{ fontWeight: 600 }}>{s.name}</td>
                            <td style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{s.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Delete Class"
        message="This will delete the class and remove all students from it. Papers assigned to this class will become unassigned. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => confirmDelete && deleteClass(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default ClassManager;
