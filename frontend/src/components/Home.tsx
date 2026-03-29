import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>AI Evaluation System</h1>
      <p>Choose your dashboard:</p>
      <div style={{ marginTop: '30px' }}>
        <Link to="/teacher" style={{ 
          display: 'inline-block', 
          margin: '10px', 
          padding: '15px 30px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          textDecoration: 'none', 
          borderRadius: '5px' 
        }}>
          Teacher Dashboard
        </Link>
        <Link to="/student" style={{ 
          display: 'inline-block', 
          margin: '10px', 
          padding: '15px 30px', 
          backgroundColor: '#28a745', 
          color: 'white', 
          textDecoration: 'none', 
          borderRadius: '5px' 
        }}>
          Student Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Home;