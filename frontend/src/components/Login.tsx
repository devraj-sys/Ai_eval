import React, { useState } from 'react';
import axios from 'axios';

interface LoginProps {
  onLogin: (token: string, user: any) => void;
  onToggleRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onToggleRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('https://ai-eval-74ay.onrender.com/api/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onLogin(response.data.token, response.data.user);
    } catch {
      setError('Invalid email or password.');
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
        <h2 className="auth-title">Sign in</h2>
        <p className="auth-subtitle">Welcome back to AI Eval</p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.65rem', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            {loading ? <span className="loading"><span className="spinner" />Signing in...</span> : 'Sign In'}
          </button>
        </form>

        <div className="auth-toggle">
          No account?{' '}
          <button onClick={onToggleRegister} className="auth-link">Create one</button>
        </div>
      </div>
    </div>
  );
};

export default Login;
