import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './Navbar';

interface Paper {
  _id: string;
  title: string;
  teacherId: { name: string };
  createdAt: string;
}

interface Submission {
  _id: string;
  paperId: { title: string };
  gradingResult: {
    question_number: number;
    awarded_marks: number;
    max_marks: number;
    feedback: string;
  }[];
  totalMarks: number;
  maxTotalMarks: number;
  percentage: number;
  createdAt: string;
}

interface StudentDashboardProps {
  user: any;
  onLogout: () => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, onLogout }) => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('token');
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchPapers();
    fetchSubmissions();
  }, []);

  const fetchPapers = async () => {
    try {
      const response = await axios.get('https://ai-eval-74ay.onrender.com/api/approved-papers', axiosConfig);
      setPapers(response.data.papers);
    } catch (error) {
      console.error('Error fetching papers:', error);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await axios.get('https://ai-eval-74ay.onrender.com/api/my-submissions', axiosConfig);
      setSubmissions(response.data.submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const submitAnswer = async () => {
    if (!file || !selectedPaper) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('studentAnswer', file);

    try {
      const response = await axios.post(`https://ai-eval-74ay.onrender.com/api/submit-answer/${selectedPaper}`, formData, axiosConfig);
      alert('Answer submitted successfully!');
      setFile(null);
      setSelectedPaper('');
      fetchSubmissions();
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer.');
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'score-excellent';
    if (percentage >= 80) return 'score-good';
    if (percentage >= 70) return 'score-average';
    return 'score-poor';
  };

  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Student Dashboard</h1>
          <p className="dashboard-subtitle">Submit your answer sheets and track your performance</p>
        </div>

        {/* Submit Answer Sheet */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📝 Submit Answer Sheet</h2>
          </div>
          
          <div className="form-group">
            <label className="form-label">Select Paper</label>
            <select 
              value={selectedPaper} 
              onChange={(e) => setSelectedPaper(e.target.value)}
              className="form-select"
            >
              <option value="">Choose a paper to submit for...</option>
              {papers.map((paper) => (
                <option key={paper._id} value={paper._id}>
                  {paper.title} - by {paper.teacherId.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Answer Sheet PDF</label>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileChange}
              className="form-input"
            />
          </div>
          
          <button 
            onClick={submitAnswer} 
            disabled={!file || !selectedPaper || loading}
            className="btn btn-success"
          >
            {loading ? (
              <span className="loading">
                <span className="spinner"></span>
                Submitting & Grading...
              </span>
            ) : (
              '🚀 Submit for Grading'
            )}
          </button>
        </div>

        {/* My Submissions */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📊 My Submissions ({submissions.length})</h2>
          </div>
          
          {submissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <p>No submissions yet. Submit your first answer sheet above!</p>
            </div>
          ) : (
            submissions.map((submission) => (
              <div key={submission._id} className="submission-item">
                <div className="submission-header">
                  <div>
                    <h3 className="paper-title">{submission.paperId.title}</h3>
                    <div className="paper-meta">
                      Submitted: {new Date(submission.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="submission-score">
                    <div className="score-main">
                      {submission.totalMarks}/{submission.maxTotalMarks}
                    </div>
                    <div className={`score-percentage ${getGradeColor(submission.percentage)}`}>
                      {submission.percentage}%
                    </div>
                  </div>
                </div>
                
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: '600', color: '#3b82f6', marginTop: '1rem' }}>
                    📋 View Detailed Feedback
                  </summary>
                  <div style={{ marginTop: '1rem' }}>
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Q#</th>
                            <th>Marks</th>
                            <th>Max</th>
                            <th>Feedback</th>
                          </tr>
                        </thead>
                        <tbody>
                          {submission.gradingResult.map((item, index) => (
                            <tr key={index}>
                              <td style={{ textAlign: 'center', fontWeight: '600' }}>
                                {item.question_number}
                              </td>
                              <td style={{ 
                                textAlign: 'center',
                                fontWeight: '600',
                                color: item.awarded_marks === item.max_marks ? '#10b981' : '#ef4444'
                              }}>
                                {item.awarded_marks}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {item.max_marks}
                              </td>
                              <td>
                                {item.feedback}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;