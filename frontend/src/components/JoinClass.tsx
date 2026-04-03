import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from './Toast';

interface ClassItem {
  _id: string;
  name: string;
  code: string;
  teacherId: { name: string };
  createdAt: string;
}

interface JoinClassProps {
  axiosConfig: object;
  onClassesChange: () => void;
}

const JoinClass: React.FC<JoinClassProps> = ({ axiosConfig, onClassesChange }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => { fetchClasses(); }, []);

  const fetchClasses = async () => {
    try {
      const res = await axios.get('https://ai-eval-74ay.onrender.com/api/my-joined-classes', axiosConfig);
      setClasses(res.data.classes);
    } catch {
      toast.error('Failed to load classes');
    }
  };

  const joinClass = async () => {
    if (!code.trim()) return;
    setJoining(true);
    try {
      const res = await axios.post('https://ai-eval-74ay.onrender.com/api/join-class', { code }, axiosConfig);
      setClasses(prev => [...prev, res.data.class]);
      setCode('');
      toast.success(`Joined "${res.data.class.name}" successfully!`);
      onClassesChange();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to join class');
    } finally {
      setJoining(false);
    }
  };

  const leaveClass = async (classId: string, className: string) => {
    try {
      await axios.post(`https://ai-eval-74ay.onrender.com/api/leave-class/${classId}`, {}, axiosConfig);
      setClasses(prev => prev.filter(c => c._id !== classId));
      toast.success(`Left "${className}"`);
      onClassesChange();
    } catch {
      toast.error('Failed to leave class');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">My Classes</h2>
        <span className="count-badge">{classes.length}</span>
      </div>

      {/* Join by code */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <input
          className="form-input"
          placeholder="Enter class code (e.g. A3F9C2)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && joinClass()}
          style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}
          maxLength={6}
        />
        <button className="btn btn-primary" onClick={joinClass} disabled={!code.trim() || joining}>
          {joining ? <span className="loading"><span className="spinner" />Joining...</span> : 'Join Class'}
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏫</div>
          <p>You haven't joined any classes yet. Enter a code from your teacher to get started.</p>
        </div>
      ) : (
        classes.map((cls) => (
          <div key={cls._id} className="paper-item">
            <div className="paper-header">
              <div>
                <h3 className="paper-title">{cls.name}</h3>
                <div className="paper-meta">Teacher: {cls.teacherId.name}</div>
                <div className="paper-meta">
                  Joined {new Date(cls.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
                <div style={{ marginTop: '0.4rem' }}>
                  <span className="class-code-badge" style={{ cursor: 'default' }}>
                    <span className="class-code-text">{cls.code}</span>
                  </span>
                </div>
              </div>
              <div className="paper-actions">
                <button className="btn btn-danger" style={{ fontSize: '0.8rem' }} onClick={() => leaveClass(cls._id, cls.name)}>
                  Leave
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default JoinClass;
