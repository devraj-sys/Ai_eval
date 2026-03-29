import React from 'react';

interface Submission {
  studentId: {
    name: string;
    email: string;
  };
  totalMarks: number;
  maxTotalMarks: number;
  percentage: number;
  createdAt: string;
}

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  paperTitle: string;
  submissions: Submission[];
}

const ResultsModal: React.FC<ResultsModalProps> = ({ isOpen, onClose, paperTitle, submissions }) => {
  if (!isOpen) return null;

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'score-excellent';
    if (percentage >= 80) return 'score-good';
    if (percentage >= 70) return 'score-average';
    return 'score-poor';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">📊 Results for: {paperTitle}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        {submissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
            <p>No submissions yet for this paper.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Email</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission, index) => (
                  <tr key={index}>
                    <td style={{ fontWeight: '600' }}>{submission.studentId.name}</td>
                    <td style={{ color: '#888' }}>{submission.studentId.email}</td>
                    <td style={{ fontWeight: '600' }}>
                      {submission.totalMarks}/{submission.maxTotalMarks}
                    </td>
                    <td>
                      <span className={`score-percentage ${getGradeColor(submission.percentage)}`}>
                        {submission.percentage}%
                      </span>
                    </td>
                    <td style={{ color: '#888' }}>
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsModal;