import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import AdminDashboard from './pages/Admin/Dashboard';
import ExamDetails from './pages/Admin/ExamDetails';
import StudentDashboard from './pages/Student/Dashboard';
import ExamRoom from './pages/Student/ExamRoom';
import StudentProfile from './pages/Admin/StudentProfile';
import Invite from './pages/Student/Invite';

const PrivateRoute = ({ children, role }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  if (!token) return <Navigate to="/login" />;
  if (role && userRole !== role) return <Navigate to="/login" />;

  return children;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground font-sans">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/admin/*" element={
            <PrivateRoute role="ADMIN">
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="exam/:examId" element={<ExamDetails />} />
                <Route path="student/:userId" element={<StudentProfile />} />
              </Routes>
            </PrivateRoute>
          } />

          <Route path="/student/*" element={
            <PrivateRoute role="STUDENT">
              <Routes>
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route path="exam/:examId" element={<ExamRoom />} />
              </Routes>
            </PrivateRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
