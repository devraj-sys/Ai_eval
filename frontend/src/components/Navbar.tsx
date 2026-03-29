import React from 'react';

interface NavbarProps {
  user: any;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        🎓 AI Evaluation System
      </div>
      <div className="navbar-user">
        <div className="user-info">
          <div className="user-name">{user.name}</div>
          <div className="user-role">{user.role}</div>
        </div>
        <button onClick={onLogout} className="btn btn-danger">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;