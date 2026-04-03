import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import GeminiLoader from './GeminiLoader';
import { toast } from './Toast';

interface Paper { _id: string; title: string; teacherId: { name: string }; createdAt: string; }
interface GradingItem { question_number: number; awarded_marks: number; max_marks: number; feedback: string; }
interface Submission { _id: string; paperId: { _id: string; title: string }; gradingResult: GradingItem[]; totalMarks: number; maxTotalMarks: number; percentage: number; createdAt: string; }
interface JoinedClass { _id: string; name: string; code: string; teacherId: { name: string }; }
interface StudentDashboardProps { user: any; onLogout: () => void; theme: 'dark' | 'light'; onToggleTheme: () => void; }

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, onLogout, theme, onToggleTheme }) => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [joinedClasses, setJoinedClasses] = useState<JoinedClass[]>([]);
  const [classCode, setClassCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<Submission | null>(null);
  const [activeClassFilter, setActiveClassFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const token = localStorage.getItem('token');
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => { await Promise.all([fetchPapers(), fetchSubmissions(), fetchClasses()]); };

  const fetchClasses = async () => {
    try { const r = await axios.get('https://ai-eval-74ay.onrender.com/api/my-joined-classes', axiosConfig); setJoinedClasses(r.data.classes); } catch {}
  };
  const fetchPapers = async () => {
    try { const r = await axios.get('https://ai-eval-74ay.onrender.com/api/approved-papers', axiosConfig); setPapers(r.data.papers); } catch { toast.error('Failed to load papers'); }
  };
  const fetchSubmissions = async () => {
    try { const r = await axios.get('https://ai-eval-74ay.onrender.com/api/my-submissions', axiosConfig); setSubmissions(r.data.submissions); } catch { toast.error('Failed to load submissions'); }
  };

  const joinClass = async () => {
    if (!classCode.trim()) return;
    setJoining(true);
    try {
      const r = await axios.post('https://ai-eval-74ay.onrender.com/api/join-class', { code: classCode }, axiosConfig);
      setJoinedClasses(prev => [...prev, r.data.class]);
      setClassCode('');
      toast.success(`Joined "${r.data.class.name}"!`);
      fetchPapers();
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to join class'); }
    finally { setJoining(false); }
  };

  const leaveClass = async (classId: string, name: string) => {
    try {
      await axios.post(`https://ai-eval-74ay.onrender.com/api/leave-class/${classId}`, {}, axiosConfig);
      setJoinedClasses(prev => prev.filter(c => c._id !== classId));
      if (activeClassFilter === classId) setActiveClassFilter('all');
      toast.success(`Left "${name}"`);
      fetchPapers();
    } catch { toast.error('Failed to leave class'); }
  };

  const submitAnswer = async () => {
    if (!file || !selectedPaper) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('studentAnswer', file);
    try {
      await axios.post(`https://ai-eval-74ay.onrender.com/api/submit-answer/${selectedPaper}`, formData, axiosConfig);
      setFile(null); setSelectedPaper('');
      fetchSubmissions();
      toast.success('Answer submitted and graded!');
    } catch { toast.error('Failed to submit answer'); }
    finally { setLoading(false); }
  };

  const gc = (p: number) => p >= 90 ? 'score-excellent' : p >= 80 ? 'score-good' : p >= 70 ? 'score-average' : 'score-poor';
  const gl = (p: number) => p >= 90 ? 'Excellent' : p >= 80 ? 'Good' : p >= 70 ? 'Average' : 'Needs Work';

  // Scoped stats based on active filter
  const getScopedSubs = (filterId: string) => {
    if (filterId === 'all') return submissions;
    const ids = new Set(papers.filter(p => (p as any).classId?._id === filterId).map(p => p._id));
    return submissions.filter(s => ids.has(s.paperId._id));
  };

  const scopedSubs = getScopedSubs(activeClassFilter);
  const scopedPapers = activeClassFilter === 'all' ? papers : papers.filter(p => (p as any).classId?._id === activeClassFilter);
  const statsLabel = activeClassFilter === 'all' ? 'Overall' : (joinedClasses.find(c => c._id === activeClassFilter)?.name || '');
  const avgScore = scopedSubs.length ? Math.round(scopedSubs.reduce((s, x) => s + x.percentage, 0) / scopedSubs.length) : 0;
  const bestScore = scopedSubs.length ? Math.max(...scopedSubs.map(s => s.percentage)) : 0;

  const getClassStats = (classId: string) => {
    const subs = getScopedSubs(classId);
    return { count: subs.length, avg: subs.length ? Math.round(subs.reduce((a, s) => a + s.percentage, 0) / subs.length) : null };
  };

  const filteredPapers = activeClassFilter === 'all' ? papers
    : papers.filter(p => (p as any).classId?._id === activeClassFilter);

  return (
    <div>
      {loading && <GeminiLoader message="Evaluating your answers with AI..." />}
      <Navbar user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />

      <div className={`layout-with-sidebar${sidebarOpen ? '' : ' sidebar-collapsed'}`}>

        {/* SIDEBAR */}
        <aside className={`sidebar${sidebarOpen ? '' : ' sidebar-hidden'}`}>
          <div className="sidebar-toggle-row">
            <span className="sidebar-section-title" style={{ margin: 0 }}>Panel</span>
            <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>✕</button>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">{statsLabel} Stats</div>
            <div className="sidebar-stats">
              <div className="sidebar-stat"><span className="sidebar-stat-value">{scopedSubs.length}</span><span className="sidebar-stat-label">Submitted</span></div>
              <div className="sidebar-stat"><span className={`sidebar-stat-value ${scopedSubs.length ? gc(avgScore) : ''}`}>{scopedSubs.length ? `${avgScore}%` : '—'}</span><span className="sidebar-stat-label">Avg</span></div>
              <div className="sidebar-stat"><span className={`sidebar-stat-value ${scopedSubs.length ? gc(bestScore) : ''}`}>{scopedSubs.length ? `${bestScore}%` : '—'}</span><span className="sidebar-stat-label">Best</span></div>
              <div className="sidebar-stat"><span className="sidebar-stat-value">{scopedPapers.length}</span><span className="sidebar-stat-label">Papers</span></div>
            </div>
          </div>

          <div className="sidebar-divider" />

          <div className="sidebar-section">
            <div className="sidebar-section-title">Filter Papers</div>
            <button className={`sidebar-filter-btn ${activeClassFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveClassFilter('all')}>
              All Papers <span className="sidebar-filter-count">{papers.length}</span>
            </button>
            {joinedClasses.map(cls => {
              const stats = getClassStats(cls._id);
              return (
                <button key={cls._id} className={`sidebar-filter-btn ${activeClassFilter === cls._id ? 'active' : ''}`} onClick={() => setActiveClassFilter(cls._id)}>
                  <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.name}</span>
                  {stats.avg !== null && <span className={`sidebar-filter-count ${gc(stats.avg)}`}>{stats.avg}%</span>}
                </button>
              );
            })}
          </div>

          <div className="sidebar-divider" />

          <div className="sidebar-section">
            <div className="sidebar-section-title">My Classes</div>
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <input className="form-input" style={{ fontSize: '0.8rem', padding: '0.45rem 0.6rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}
                placeholder="Class code..." value={classCode} maxLength={6}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && joinClass()} />
              <button className="btn btn-primary" style={{ padding: '0.45rem 0.7rem', fontSize: '0.8rem', flexShrink: 0 }}
                onClick={joinClass} disabled={!classCode.trim() || joining}>
                {joining ? '...' : 'Join'}
              </button>
            </div>
            {joinedClasses.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontStyle: 'italic' }}>No classes joined yet.</p>
            ) : joinedClasses.map(cls => {
              const stats = getClassStats(cls._id);
              return (
                <div key={cls._id} className="sidebar-class-item">
                  <div className="sidebar-class-header">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="sidebar-class-name">{cls.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>by {cls.teacherId.name}</div>
                      {stats.count > 0 && (
                        <div style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>
                          <span className={gc(stats.avg || 0)}>{stats.avg}% avg</span>
                          <span style={{ color: 'var(--text-3)' }}> · {stats.count} submitted</span>
                        </div>
                      )}
                    </div>
                    <button className="btn btn-danger" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', flexShrink: 0 }}
                      onClick={() => leaveClass(cls._id, cls.name)}>Leave</button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* MAIN */}
        <main className="main-content">
          {!sidebarOpen && (
            <button className="sidebar-open-btn" onClick={() => setSidebarOpen(true)}>☰ Panel</button>
          )}

          <div className="dashboard-header">
            <h1 className="dashboard-title">Answer Sheets</h1>
            <p className="dashboard-subtitle">Submit your answers and track your results</p>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="card-title">Submit Answer Sheet</h2></div>
            <div className="form-group">
              <label className="form-label">Select Paper</label>
              <select value={selectedPaper} onChange={(e) => setSelectedPaper(e.target.value)} className="form-select">
                <option value="">Choose a paper...</option>
                {filteredPapers.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.title} — by {p.teacherId.name}{(p as any).classId ? ` · ${(p as any).classId.name}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Answer Sheet PDF</label>
              <div className="file-upload-wrapper">
                <label className={`file-upload-label ${file ? 'has-file' : ''}`}>
                  <span>{file ? '✓' : '↑'}</span>
                  <span>{file ? file.name : 'Click to upload your answer sheet'}</span>
                  <input type="file" accept=".pdf" className="file-upload-input" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
                </label>
              </div>
            </div>
            <button onClick={submitAnswer} disabled={!file || !selectedPaper || loading} className="btn btn-primary">
              Submit for AI Grading
            </button>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">My Submissions</h2>
              <span className="count-badge">{submissions.length}</span>
            </div>
            {submissions.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">📋</div><p>No submissions yet.</p></div>
            ) : submissions.map(sub => (
              <div key={sub._id} className="submission-item">
                <div className="submission-header">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="paper-title">{sub.paperId.title}</h3>
                    <div className="paper-meta">{new Date(sub.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                    <div className="score-bar-wrapper">
                      <div className="score-bar-track">
                        <div className={`score-bar-fill ${gc(sub.percentage)}`} style={{ width: `${sub.percentage}%` }} />
                      </div>
                      <span className="score-bar-label">{sub.percentage}%</span>
                    </div>
                  </div>
                  <div className="submission-score">
                    <div className="score-main">{sub.totalMarks}<span style={{ fontSize: '0.85rem', color: 'var(--text-3)', fontWeight: 400 }}>/{sub.maxTotalMarks}</span></div>
                    <span className={`score-badge ${gc(sub.percentage)}`}>{gl(sub.percentage)}</span>
                  </div>
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={() => setFeedbackModal(sub)}>View Feedback</button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {feedbackModal && (
        <div className="modal-overlay" onClick={() => setFeedbackModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{feedbackModal.paperId.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>
                  Score: {feedbackModal.totalMarks}/{feedbackModal.maxTotalMarks} · <span className={gc(feedbackModal.percentage)}>{feedbackModal.percentage}%</span>
                </div>
              </div>
              <button className="close-btn" onClick={() => setFeedbackModal(null)}>✕</button>
            </div>
            <div className="table-container">
              <table className="table">
                <thead><tr><th style={{ width: '60px' }}>Q#</th><th style={{ width: '100px' }}>Marks</th><th style={{ width: '80px' }}>Max</th><th>Feedback</th></tr></thead>
                <tbody>
                  {feedbackModal.gradingResult.map((item, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-2)' }}>{item.question_number}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: item.awarded_marks === item.max_marks ? 'var(--success)' : item.awarded_marks === 0 ? 'var(--danger)' : 'var(--warning)' }}>{item.awarded_marks}</td>
                      <td style={{ textAlign: 'center', color: 'var(--text-3)' }}>{item.max_marks}</td>
                      <td style={{ color: 'var(--text-2)', fontSize: '0.825rem', lineHeight: '1.5' }}>{item.feedback}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
