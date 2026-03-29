import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import ResultsModal from './ResultsModal';

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

interface TeacherDashboardProps {
  user: any;
  onLogout: () => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onLogout }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultsModal, setResultsModal] = useState<{isOpen: boolean, paperTitle: string, submissions: any[]}>({isOpen: false, paperTitle: '', submissions: []});

  const token = localStorage.getItem('token');
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/my-papers', axiosConfig);
      setPapers(response.data.papers);
    } catch (error) {
      console.error('Error fetching papers:', error);
    }
  };

  const createPaper = async () => {
    if (!file || !title) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('questionPaper', file);
    formData.append('title', title);

    try {
      const response = await axios.post('http://localhost:5000/api/create-paper', formData, axiosConfig);
      setPapers([...papers, response.data.paper]);
      setFile(null);
      setTitle('');
      alert('Paper created successfully');
    } catch (error) {
      console.error('Error creating paper:', error);
      alert('Failed to create paper');
    } finally {
      setLoading(false);
    }
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
      await axios.put(`http://localhost:5000/api/update-paper/${selectedPaper._id}`, 
        { answerKey: selectedPaper.answerKey }, axiosConfig);
      fetchPapers();
      alert('Answer key saved successfully');
    } catch (error) {
      console.error('Error saving answer key:', error);
      alert('Failed to save answer key');
    }
  };

  const approvePaper = async (paperId: string) => {
    try {
      await axios.put(`http://localhost:5000/api/approve-paper/${paperId}`, {}, axiosConfig);
      fetchPapers();
      alert('Paper approved successfully');
    } catch (error) {
      console.error('Error approving paper:', error);
      alert('Failed to approve paper');
    }
  };

  const deletePaper = async (paperId: string) => {
    if (!window.confirm('Are you sure you want to delete this paper? This will also delete all student submissions.')) return;
    try {
      await axios.delete(`http://localhost:5000/api/delete-paper/${paperId}`, axiosConfig);
      fetchPapers();
      alert('Paper deleted successfully');
    } catch (error) {
      console.error('Error deleting paper:', error);
      alert('Failed to delete paper');
    }
  };

  const viewResults = async (paperId: string, paperTitle: string) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/paper-results/${paperId}`, axiosConfig);
      const results = response.data;
      setResultsModal({
        isOpen: true,
        paperTitle: results.paper,
        submissions: results.submissions
      });
    } catch (error) {
      console.error('Error fetching results:', error);
      alert('Failed to fetch results');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Teacher Dashboard</h1>
          <p className="dashboard-subtitle">Create and manage question papers with AI-powered answer keys</p>
        </div>

        {/* Create New Paper */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📝 Create New Paper</h2>
          </div>
          
          <div className="form-group">
            <label className="form-label">Paper Title</label>
            <input 
              type="text" 
              className="form-input"
              placeholder="Enter paper title (e.g., Mathematics Final Exam 2024)" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Question Paper PDF</label>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileChange}
              className="form-input"
            />
          </div>
          
          <button 
            onClick={createPaper} 
            disabled={!file || !title || loading}
            className="btn btn-primary"
          >
            {loading ? (
              <span className="loading">
                <span className="spinner"></span>
                Creating Paper...
              </span>
            ) : (
              '✨ Create Paper with AI'
            )}
          </button>
        </div>

        {/* My Papers */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📚 My Papers ({papers.length})</h2>
          </div>
          
          {papers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <p>No papers created yet. Create your first paper above!</p>
            </div>
          ) : (
            papers.map((paper) => (
              <div key={paper._id} className="paper-item">
                <div className="paper-header">
                  <div>
                    <h3 className="paper-title">{paper.title}</h3>
                    <div className="paper-meta">
                      Created: {new Date(paper.createdAt).toLocaleDateString()}
                    </div>
                    <div className="paper-meta">
                      Questions: {paper.answerKey.length}
                    </div>
                    <span className={`paper-status ${paper.isApproved ? 'status-approved' : 'status-pending'}`}>
                      {paper.isApproved ? '✅ Approved' : '⏳ Pending'}
                    </span>
                  </div>
                  <div className="paper-actions">
                    <button 
                      onClick={() => setSelectedPaper(paper)}
                      className="btn btn-info"
                    >
                      ✏️ Edit
                    </button>
                    {!paper.isApproved && (
                      <button 
                        onClick={() => approvePaper(paper._id)}
                        className="btn btn-success"
                      >
                        ✅ Approve
                      </button>
                    )}
                    <button 
                      onClick={() => viewResults(paper._id, paper.title)}
                      className="btn btn-warning"
                    >
                      📊 Results
                    </button>
                    <button 
                      onClick={() => deletePaper(paper._id)}
                      className="btn btn-danger"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Results Modal */}
        <ResultsModal 
          isOpen={resultsModal.isOpen}
          onClose={() => setResultsModal({isOpen: false, paperTitle: '', submissions: []})}
          paperTitle={resultsModal.paperTitle}
          submissions={resultsModal.submissions}
        />

        {/* Edit Answer Key Modal */}
        {selectedPaper && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">✏️ Edit Answer Key - {selectedPaper.title}</h2>
              <button 
                onClick={() => setSelectedPaper(null)}
                className="btn btn-secondary"
              >
                ✕ Close
              </button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <button 
                onClick={saveAnswerKey}
                className="btn btn-success"
              >
                💾 Save Changes
              </button>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Question #</th>
                    <th>Expected Answer</th>
                    <th>Max Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPaper.answerKey.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="number"
                          value={item.question_number}
                          onChange={(e) => updateAnswerKey(index, 'question_number', parseInt(e.target.value))}
                          className="form-input"
                          style={{ width: '80px' }}
                        />
                      </td>
                      <td>
                        <textarea
                          value={item.expected_answer}
                          onChange={(e) => updateAnswerKey(index, 'expected_answer', e.target.value)}
                          className="form-textarea"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.max_marks}
                          onChange={(e) => updateAnswerKey(index, 'max_marks', parseInt(e.target.value))}
                          className="form-input"
                          style={{ width: '80px' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;