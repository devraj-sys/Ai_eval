import React, { useState } from 'react';
import axios from 'axios';

interface RegisterProps {
  onLogin: (token: string, user: any) => void;
  onToggleLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onLogin, onToggleLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('https://ai-eval-74ay.onrender.com/api/register', { name, email, password, role });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onLogin(response.data.token, response.data.user);
    } catch {
      setError('Registration failed. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">🎓</span>
        </div>
        <h2 className="auth-title">Create account</h2>
        <p className="auth-subtitle">Join AI Eval</p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">I am a</label>
            <div className="role-toggle">
              <button type="button" className={`role-btn ${role === 'student' ? 'active' : ''}`} onClick={() => setRole('student')}>Student</button>
              <button type="button" className={`role-btn ${role === 'teacher' ? 'active' : ''}`} onClick={() => setRole('teacher')}>Teacher</button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.65rem', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            {loading ? <span className="loading"><span className="spinner" />Creating account...</span> : 'Create Account'}
          </button>
        </form>

        <div className="auth-toggle">
          Already have an account?{' '}
          <button onClick={onToggleLogin} className="auth-link">Sign in</button>
        </div>
      </div>
    </div>
  );
};

export default Register;
