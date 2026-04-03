import React from 'react';

interface NavbarProps {
  user: any;
  onLogout: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, theme, onToggleTheme }) => {
  const initials = user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-brand-icon">🎓</span>
        AI Eval
      </div>
      <div className="navbar-user">
        <button className="theme-toggle-nav" onClick={onToggleTheme} title="Toggle theme">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <div className="user-info">
          <div className="user-name">{user.name}</div>
          <div className="user-role">{user.role}</div>
        </div>
        <div className="user-avatar">{initials}</div>
        <button onClick={onLogout} className="btn btn-secondary">Sign out</button>
      </div>
    </nav>
  );
};

export default Navbar;
