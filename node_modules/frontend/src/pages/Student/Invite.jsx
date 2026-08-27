import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Invite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // In a real app, this page would fetch the invite details (exam title, student name)
  // using a public endpoint (GET /api/invites/:token) and then ask the user to confirm/login.
  // For simplicity, we just simulate an acceptance flow.

  useEffect(() => {
    // Simulate validation
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const handleAccept = () => {
    // Navigate them to login so they can authenticate and then take the exam.
    navigate('/login');
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-background">Validating Invitation...</div>;
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background p-4">
      <div className="max-w-md w-full p-8 rounded-xl border border-border bg-card shadow-lg text-center space-y-6">
        <h2 className="text-2xl font-bold">You've been invited!</h2>
        <p className="text-muted-foreground">You have received a secure invitation to take an examination.</p>
        <button 
          onClick={handleAccept}
          className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Login to Accept
        </button>
      </div>
    </div>
  );
}
