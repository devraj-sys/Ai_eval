import React, { useState, useMemo } from 'react';

interface Submission {
  studentId: { name: string; email: string };
  totalMarks: number;
  maxTotalMarks: number;
  percentage: number;
  createdAt: string;
}

type SortKey = 'score-desc' | 'score-asc' | 'date-desc' | 'date-asc';

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  paperTitle: string;
  submissions: Submission[];
}

const ResultsModal: React.FC<ResultsModalProps> = ({ isOpen, onClose, paperTitle, submissions }) => {
  const [sort, setSort] = useState<SortKey>('score-desc');

  const getGradeColor = (p: number) => p >= 90 ? 'score-excellent' : p >= 80 ? 'score-good' : p >= 70 ? 'score-average' : 'score-poor';
  const avg = submissions.length ? Math.round(submissions.reduce((s, x) => s + x.percentage, 0) / submissions.length) : 0;

  const sorted = useMemo(() => [...submissions].sort((a, b) => {
    if (sort === 'score-desc') return b.percentage - a.percentage;
    if (sort === 'score-asc')  return a.percentage - b.percentage;
    if (sort === 'date-desc')  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }), [submissions, sort]);

  if (!isOpen) return null;

  const exportCSV = () => {
    const rows = [
      ['Student', 'Email', 'Score', 'Max', 'Percentage', 'Submitted'],
      ...sorted.map(s => [
        s.studentId?.name || 'Unknown',
        s.studentId?.email || 'Unknown',
        s.totalMarks,
        s.maxTotalMarks,
        `${s.percentage}%`,
        new Date(s.createdAt).toLocaleDateString()
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${paperTitle.replace(/\s+/g, '_')}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{paperTitle} — Results</div>
            {submissions.length > 0 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>
                {submissions.length} submissions · Class avg:&nbsp;
                <span className={getGradeColor(avg)} style={{ fontWeight: 600 }}>{avg}%</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {submissions.length > 0 && (
              <button className="btn btn-secondary" style={{ fontSize: '0.775rem', padding: '0.35rem 0.7rem' }} onClick={exportCSV}>
                Export CSV
              </button>
            )}
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <p>No submissions yet for this paper.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {([['score-desc', 'Score ↓'], ['score-asc', 'Score ↑'], ['date-desc', 'Newest'], ['date-asc', 'Oldest']] as [SortKey, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.775rem', padding: '0.3rem 0.65rem', ...(sort === key ? { background: 'var(--bg-hover)', color: 'var(--text-1)', borderColor: '#555' } : {}) }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Score</th>
                    <th>Grade</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{s.studentId?.name || '—'}</td>
                      <td style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{s.studentId?.email || '—'}</td>
                      <td style={{ fontWeight: 700 }}>
                        {s.totalMarks}<span style={{ color: 'var(--text-3)', fontWeight: 400 }}>/{s.maxTotalMarks}</span>
                      </td>
                      <td>
                        <span className={`score-badge ${getGradeColor(s.percentage)}`}>{s.percentage}%</span>
                      </td>
                      <td style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>
                        {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResultsModal;
