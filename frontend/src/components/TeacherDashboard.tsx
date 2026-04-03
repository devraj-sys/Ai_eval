import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import ResultsModal from './ResultsModal';
import GeminiLoader from './GeminiLoader';
import ConfirmModal from './ConfirmModal';
import { toast } from './Toast';

interface AnswerKeyItem {
  question_number: number;
  expected_answer: string;
  max_marks: number;
}

interface Paper {
  _id: string;
  title: string;
  answerKey: AnswerKeyItem[];
  isApproved: boolean;
  createdAt: string;
}

interface ClassItem {
  _id: string;
  name: string;
  code: string;
  students: { _id: string; name: string; email: string }[];
  createdAt: string;
}

interface TeacherDashboardProps {
  user: any;
  onLogout: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onLogout, theme, onToggleTheme }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaderMsg, setLoaderMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteClass, setConfirmDeleteClass] = useState<string | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeClassFilter, setActiveClassFilter] = useState<string>('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [resultsModal, setResultsModal] = useState<{ isOpen: boolean; paperTitle: string; submissions: any[] }>({ isOpen: false, paperTitle: '', submissions: [] });

  const token = localStorage.getItem('token');
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPapers(); fetchClasses(); }, []);

  const fetchClasses = async () => {
    try {
      const res = await axios.get('https://ai-eval-74ay.onrender.com/api/my-classes', axiosConfig);
      setClasses(res.data.classes);
    } catch {}
  };

  const fetchPapers = async () => {
    try {
      const res = await axios.get('https://ai-eval-74ay.onrender.com/api/my-papers', axiosConfig);
      setPapers(res.data.papers);
    } catch { toast.error('Failed to load papers'); }
  };

  const createClass = async () => {
    if (!newClassName.trim()) return;
    try {
      const res = await axios.post('https://ai-eval-74ay.onrender.com/api/create-class', { name: newClassName }, axiosConfig);
      setClasses(prev => [...prev, res.data.class]);
      setNewClassName('');
      toast.success(`Class created! Code: ${res.data.class.code}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create class');
    }
  };

  const deleteClass = async (classId: string) => {
    try {
      await axios.delete(`https://ai-eval-74ay.onrender.com/api/delete-class/${classId}`, axiosConfig);
      setClasses(prev => prev.filter(c => c._id !== classId));
      if (activeClassFilter === classId) setActiveClassFilter('all');
      toast.success('Class deleted');
    } catch { toast.error('Failed to delete class'); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.info('Code copied!');
  };

  const createPaper = async () => {
    if (!file || !title) return;
    setLoaderMsg('Analyzing your question paper with AI...');
    setLoading(true);
    const formData = new FormData();
    formData.append('questionPaper', file);
    formData.append('title', title);
    if (selectedClassId) formData.append('classId', selectedClassId);
    try {
      const res = await axios.post('https://ai-eval-74ay.onrender.com/api/create-paper', formData, axiosConfig);
      setPapers(prev => [...prev, res.data.paper]);
      setFile(null); setTitle(''); setSelectedClassId('');
      toast.success('Paper created successfully');
    } catch { toast.error('Failed to create paper'); }
    finally { setLoading(false); }
  };

  const updateAnswerKey = (index: number, field: keyof AnswerKeyItem, value: string | number) => {
    if (!selectedPaper) return;
    const updated = [...selectedPaper.answerKey];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedPaper({ ...selectedPaper, answerKey: updated });
  };

  const saveAnswerKey = async () => {
    if (!selectedPaper) return;
    try {
      await axios.put(`https://ai-eval-74ay.onrender.com/api/update-paper/${selectedPaper._id}`, { answerKey: selectedPaper.answerKey }, axiosConfig);
      fetchPapers(); setSelectedPaper(null);
      toast.success('Answer key saved');
    } catch { toast.error('Failed to save answer key'); }
  };

  const approvePaper = async (paperId: string) => {
    try {
      await axios.put(`https://ai-eval-74ay.onrender.com/api/approve-paper/${paperId}`, {}, axiosConfig);
      fetchPapers(); toast.success('Paper approved and is now live');
    } catch { toast.error('Failed to approve paper'); }
  };

  const deletePaper = async (paperId: string) => {
    try {
      await axios.delete(`https://ai-eval-74ay.onrender.com/api/delete-paper/${paperId}`, axiosConfig);
      fetchPapers(); toast.success('Paper deleted');
    } catch { toast.error('Failed to delete paper'); }
  };

  const viewResults = async (paperId: string, _?: string) => {
    try {
      const res = await axios.get(`https://ai-eval-74ay.onrender.com/api/paper-results/${paperId}`, axiosConfig);
      setResultsModal({ isOpen: true, paperTitle: res.data.paper, submissions: res.data.submissions });
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message || 'Failed to fetch results';
      toast.error(`${status ? `[${status}] ` : ''}${msg}`);
      console.error('viewResults error:', err?.response?.data);
    }
  };

  const getClassStats = (classId: string) => {
    const classPapers = papers.filter(p => (p as any).classId?._id === classId || (p as any).classId === classId);
    return { papers: classPapers.length, live: classPapers.filter(p => p.isApproved).length };
  };

  const getPapersForFilter = (filterId: string) => papers.filter(p => {
    if (filterId === 'all') return true;
    return (p as any).classId?._id === filterId || (p as any).classId === filterId;
  });

  const filteredPapers = getPapersForFilter(activeClassFilter).filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  // Stats reactive to selected class filter
  const statsScope = getPapersForFilter(activeClassFilter);
  const statsLabel = activeClassFilter === 'all' ? 'Overall' : activeClassFilter === 'none' ? 'Unassigned' : classes.find(c => c._id === activeClassFilter)?.name || '';
  const approvedCount = statsScope.filter(p => p.isApproved).length;
  const totalStudents = activeClassFilter === 'all'
    ? classes.reduce((s, c) => s + c.students.length, 0)
    : (classes.find(c => c._id === activeClassFilter)?.students.length ?? 0);

  return (
    <div>
      {loading && <GeminiLoader message={loaderMsg} />}
      <Navbar user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />

      <div className={`layout-with-sidebar${sidebarOpen ? '' : ' sidebar-collapsed'}`}>

        {/* ── LEFT SIDEBAR ── */}
        <aside className={`sidebar${sidebarOpen ? '' : ' sidebar-hidden'}`}>
          <div className="sidebar-toggle-row">
            <span className="sidebar-section-title" style={{ margin: 0 }}>Panel</span>
            <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>✕</button>
          </div>

          {/* Stats — reactive to selected class */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">{statsLabel} Stats</div>
            <div className="sidebar-stats">
              <div className="sidebar-stat"><span className="sidebar-stat-value">{statsScope.length}</span><span className="sidebar-stat-label">Papers</span></div>
              <div className="sidebar-stat"><span className="sidebar-stat-value">{approvedCount}</span><span className="sidebar-stat-label">Live</span></div>
              <div className="sidebar-stat"><span className="sidebar-stat-value">{activeClassFilter === 'all' ? classes.length : '—'}</span><span className="sidebar-stat-label">Classes</span></div>
              <div className="sidebar-stat"><span className="sidebar-stat-value">{totalStudents}</span><span className="sidebar-stat-label">Students</span></div>
            </div>
          </div>

          <div className="sidebar-divider" />

          {/* Filter by class */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">Filter Papers</div>
            <button className={`sidebar-filter-btn ${activeClassFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveClassFilter('all')}>
              All Papers <span className="sidebar-filter-count">{papers.length}</span>
            </button>
            {classes.map(cls => {
              const stats = getClassStats(cls._id);
              return (
                <button key={cls._id} className={`sidebar-filter-btn ${activeClassFilter === cls._id ? 'active' : ''}`} onClick={() => setActiveClassFilter(cls._id)}>
                  <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.name}</span>
                  <span className="sidebar-filter-count">{stats.papers}</span>
                </button>
              );
            })}
          </div>

          <div className="sidebar-divider" />

          {/* Classes Management */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">My Classes</div>

            {/* Create class input */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <input className="form-input" style={{ fontSize: '0.8rem', padding: '0.45rem 0.6rem' }}
                placeholder="New class name..." value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createClass()} />
              <button className="btn btn-primary" style={{ padding: '0.45rem 0.7rem', fontSize: '0.8rem', flexShrink: 0 }}
                onClick={createClass} disabled={!newClassName.trim()}>+</button>
            </div>

            {classes.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontStyle: 'italic' }}>No classes yet.</p>
            ) : (
              classes.map(cls => (
                <div key={cls._id} className="sidebar-class-item">
                  <div className="sidebar-class-header">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="sidebar-class-name">{cls.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
                        <div className="class-code-badge" style={{ cursor: 'pointer' }} onClick={() => copyCode(cls.code)}>
                          <span className="class-code-text" style={{ fontSize: '0.75rem', letterSpacing: '2px' }}>{cls.code}</span>
                          <span className="class-code-copy">{copiedCode === cls.code ? '✓' : '⧉'}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
                        {cls.students.length} student{cls.students.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <button className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => setExpandedClass(expandedClass === cls._id ? null : cls._id)}>
                        {expandedClass === cls._id ? 'Hide' : 'Members'}
                      </button>
                      <button className="btn btn-danger" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => setConfirmDeleteClass(cls._id)}>Delete</button>
                    </div>
                  </div>

                  {expandedClass === cls._id && (
                    <div className="sidebar-members">
                      {cls.students.length === 0 ? (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontStyle: 'italic' }}>No students yet.</p>
                      ) : (
                        cls.students.map((s, i) => (
                          <div key={s._id} className="sidebar-member-row">
                            <span className="sidebar-member-num">{i + 1}</span>
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-1)' }}>{s.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{s.email}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="main-content">
          {!sidebarOpen && (
            <button className="sidebar-open-btn" onClick={() => setSidebarOpen(true)}>☰ Panel</button>
          )}
          <div className="dashboard-header">
            <h1 className="dashboard-title">Question Papers</h1>
            <p className="dashboard-subtitle">Create and manage papers with AI-powered answer keys</p>
          </div>

          {/* Create New Paper */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Create New Paper</h2>
            </div>
            {classes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏫</div>
                <p>Create a class first before adding papers.</p>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Paper Title</label>
                  <input type="text" className="form-input" placeholder="e.g. Mathematics Final Exam 2024" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Class</label>
                  <select className="form-select" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
                    <option value="">Select a class...</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Question Paper PDF</label>
                  <div className="file-upload-wrapper">
                    <label className={`file-upload-label ${file ? 'has-file' : ''}`}>
                      <span>{file ? '✓' : '↑'}</span>
                      <span>{file ? file.name : 'Click to upload PDF'}</span>
                      <input type="file" accept=".pdf" className="file-upload-input" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
                    </label>
                  </div>
                </div>
                <button onClick={createPaper} disabled={!file || !title || !selectedClassId || loading} className="btn btn-primary">
                  Generate Answer Key with AI
                </button>
              </>
            )}
          </div>

          {/* Papers List */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                {activeClassFilter === 'all' ? 'All Papers' : classes.find(c => c._id === activeClassFilter)?.name || 'Papers'}
              </h2>
              <span className="count-badge">{filteredPapers.length}</span>
            </div>

            {papers.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <input className="form-input" placeholder="Search papers..." value={search}
                  onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: '300px' }} />
              </div>
            )}

            {filteredPapers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📄</div>
                <p>{papers.length === 0 ? 'No papers yet. Create your first one above.' : 'No papers match your filter.'}</p>
              </div>
            ) : (
              filteredPapers.map((paper) => {
                const hasEmptyAnswers = paper.answerKey.some(a => !a.expected_answer?.trim());
                return (
                  <div key={paper._id} className="paper-item">
                    <div className="paper-header">
                      <div>
                        <h3 className="paper-title">{paper.title}</h3>
                        <div className="paper-meta">
                          {new Date(paper.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          {' · '}{paper.answerKey.length} questions
                          {(paper as any).classId && <span style={{ color: 'var(--info)' }}>{' · '}{(paper as any).classId.name}</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                          <span className={`paper-status ${paper.isApproved ? 'status-approved' : 'status-pending'}`}>
                            {paper.isApproved ? 'Live' : 'Draft'}
                          </span>
                          {hasEmptyAnswers && <span className="warning-badge">⚠ Missing answers</span>}
                        </div>
                      </div>
                      <div className="paper-actions">
                        <button onClick={() => setSelectedPaper(paper)} className="btn btn-info">Edit Key</button>
                        {!paper.isApproved && (
                          <button onClick={() => approvePaper(paper._id)} className="btn btn-success"
                            disabled={hasEmptyAnswers} title={hasEmptyAnswers ? 'Fill all answers before approving' : ''}>
                            Approve
                          </button>
                        )}
                        <button onClick={() => viewResults(paper._id, paper.title)} className="btn btn-warning">Results</button>
                        <button onClick={() => setConfirmDelete(paper._id)} className="btn btn-danger">Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <ResultsModal isOpen={resultsModal.isOpen} onClose={() => setResultsModal({ isOpen: false, paperTitle: '', submissions: [] })} paperTitle={resultsModal.paperTitle} submissions={resultsModal.submissions} />

      <ConfirmModal isOpen={!!confirmDelete} title="Delete Paper" message="This will permanently delete the paper and all student submissions. This cannot be undone." confirmLabel="Delete"
        onConfirm={() => confirmDelete && deletePaper(confirmDelete)} onCancel={() => setConfirmDelete(null)} />

      <ConfirmModal isOpen={!!confirmDeleteClass} title="Delete Class" message="This will delete the class and remove all students from it. Papers assigned to this class will become unassigned." confirmLabel="Delete"
        onConfirm={() => confirmDeleteClass && deleteClass(confirmDeleteClass)} onCancel={() => setConfirmDeleteClass(null)} />

      {selectedPaper && (
        <div className="modal-overlay" onClick={() => setSelectedPaper(null)}>
          <div className="modal-content" style={{ maxWidth: '860px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Edit Answer Key</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>{selectedPaper.title}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button onClick={saveAnswerKey} className="btn btn-success">Save Changes</button>
                <button onClick={() => setSelectedPaper(null)} className="close-btn">✕</button>
              </div>
            </div>
            <div className="table-container">
              <table className="table">
                <thead><tr><th style={{ width: '70px' }}>Q #</th><th>Expected Answer</th><th style={{ width: '90px' }}>Max Marks</th><th style={{ width: '80px' }}></th></tr></thead>
                <tbody>
                  {selectedPaper.answerKey.map((item, index) => (
                    <tr key={index} style={{ cursor: 'pointer' }} onClick={() => setSelectedAnswerIndex(index)}>
                      <td style={{ fontWeight: 600, color: 'var(--text-2)' }}>Q{item.question_number}</td>
                      <td style={{ maxWidth: '400px' }}>
                        {item.expected_answer
                          ? <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-2)', fontSize: '0.85rem' }}>{item.expected_answer}</div>
                          : <span style={{ color: 'var(--warning)', fontSize: '0.8rem', fontStyle: 'italic' }}>⚠ No answer set</span>}
                      </td>
                      <td style={{ color: 'var(--text-2)', textAlign: 'center' }}>{item.max_marks}</td>
                      <td><button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={(e) => { e.stopPropagation(); setSelectedAnswerIndex(index); }}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedPaper && selectedAnswerIndex !== null && (() => {
        const item = selectedPaper.answerKey[selectedAnswerIndex];
        return (
          <div className="modal-overlay" onClick={() => setSelectedAnswerIndex(null)}>
            <div className="modal-content" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">Question {item.question_number}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>{selectedAnswerIndex + 1} of {selectedPaper.answerKey.length} · {selectedPaper.title}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {selectedAnswerIndex > 0 && <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem' }} onClick={() => setSelectedAnswerIndex(selectedAnswerIndex - 1)}>← Prev</button>}
                  {selectedAnswerIndex < selectedPaper.answerKey.length - 1 && <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem' }} onClick={() => setSelectedAnswerIndex(selectedAnswerIndex + 1)}>Next →</button>}
                  <button className="close-btn" onClick={() => setSelectedAnswerIndex(null)}>✕</button>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Question Number</label><input type="number" className="form-input" style={{ width: '100px' }} value={item.question_number} onChange={(e) => updateAnswerKey(selectedAnswerIndex, 'question_number', parseInt(e.target.value))} /></div>
              <div className="form-group"><label className="form-label">Expected Answer</label><textarea className="form-textarea" style={{ minHeight: '160px', lineHeight: '1.6' }} value={item.expected_answer} onChange={(e) => updateAnswerKey(selectedAnswerIndex, 'expected_answer', e.target.value)} placeholder="Enter the expected answer..." /></div>
              <div className="form-group"><label className="form-label">Max Marks</label><input type="number" className="form-input" style={{ width: '100px' }} value={item.max_marks} onChange={(e) => updateAnswerKey(selectedAnswerIndex, 'max_marks', parseInt(e.target.value))} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedAnswerIndex(null)}>Cancel</button>
                <button className="btn btn-success" onClick={() => setSelectedAnswerIndex(null)}>Done</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default TeacherDashboard;
