import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import { ToastContainer } from './components/Toast';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogin = (token: string, userData: any) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  if (!isAuthenticated) {
    return (
      <div className="App">
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        {showRegister ? (
          <Register onLogin={handleLogin} onToggleLogin={() => setShowRegister(false)} />
        ) : (
          <Login onLogin={handleLogin} onToggleRegister={() => setShowRegister(true)} />
        )}
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="App">
      {user?.role === 'teacher' ? (
        <TeacherDashboard user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />
      ) : (
        <StudentDashboard user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />
      )}
      <ToastContainer />
    </div>
  );
}

export default App;
