import React from 'react';
import { useAuth } from '../utils/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminPanel from './AdminPanel';
import TeacherPanel from './TeacherPanel';
import StudentPanel from './StudentPanel';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>
      <div>
        <strong>Username:</strong> {user.username}<br />
        <strong>Role:</strong> {user.role}
      </div>
      <button onClick={handleLogout}>Logout</button>
      {user.role === 'Admin' && <AdminPanel />}
      {user.role === 'Teacher' && <TeacherPanel />}
      {user.role === 'Student' && <StudentPanel />}
    </div>
  );
}

export default Dashboard;
