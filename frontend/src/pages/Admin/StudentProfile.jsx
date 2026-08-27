import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function StudentProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/users/${userId}/profile`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setProfile(res.data);
      } catch (error) {
        console.error("Error fetching profile", error);
      }
    };
    fetchProfile();
  }, [userId]);

  if (!profile) return <div className="p-10 flex justify-center text-muted-foreground">Loading Profile...</div>;

  const { user, stats, results, proctoringEvents } = profile;

  return (
    <div className="flex min-h-screen flex-col bg-background p-6 md:p-10 max-w-6xl mx-auto">
      <button 
        onClick={() => navigate('/admin/dashboard')}
        className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 w-fit transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </button>

      <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">Status: <span className={user.status === 'ACTIVE' ? 'text-emerald-500' : 'text-destructive'}>{user.status}</span></p>
          <p className="text-sm font-medium mt-1">Batch: {user.group ? user.group.name : 'Unassigned'}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm text-center">
          <p className="text-sm text-muted-foreground mb-2">Exams Taken</p>
          <p className="text-3xl font-bold">{stats.totalExams}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm text-center">
          <p className="text-sm text-muted-foreground mb-2">Average Score</p>
          <p className="text-3xl font-bold">{stats.averageScore.toFixed(1)}%</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm text-center">
          <p className="text-sm text-muted-foreground mb-2">Credibility Index (Flags)</p>
          <p className="text-3xl font-bold text-destructive">{stats.totalFlags}</p>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Exam History</h2>
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-secondary text-secondary-foreground">
            <tr>
              <th className="px-6 py-4">Exam Title</th>
              <th className="px-6 py-4">Score</th>
              <th className="px-6 py-4">Flags Triggered</th>
              <th className="px-6 py-4">Date Taken</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {results.map(r => {
              const flags = proctoringEvents.filter(e => e.examId === r.examId);
              return (
                <tr key={r.id} className="hover:bg-accent/50">
                  <td className="px-6 py-4 font-medium">{r.exam.title}</td>
                  <td className="px-6 py-4 font-semibold">{r.score}%</td>
                  <td className="px-6 py-4">
                    {flags.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> {flags.length} Flags
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">Clean</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {results.length === 0 && (
              <tr><td colSpan="4" className="text-center py-8 text-muted-foreground">No exams taken yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
