import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, Play } from 'lucide-react';

export default function StudentDashboard() {
  const [exams, setExams] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/exams', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setExams(res.data);
      } catch (err) {
        console.error('Error fetching exams', err);
      }
    };
    fetchExams();
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">Student Dashboard</span>
        </div>
        <button
          onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}
          className="flex items-center space-x-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium hover:bg-secondary/80"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
        <h2 className="text-2xl font-bold tracking-tight mb-8">Available Examinations</h2>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => {
            const hasCompleted = exam.results && exam.results.length > 0 && ['SUBMITTED', 'FORCE_SUBMITTED'].includes(exam.results[0].status);
            const score = hasCompleted ? exam.results[0].score : null;

            return (
              <div key={exam.id} className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between hover:border-primary/50 transition-colors">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-lg">{exam.title}</h3>
                    {hasCompleted && (
                      <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">Completed</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{exam.description || 'No description provided.'}</p>
                  <div className="mt-4 flex flex-col space-y-1 text-sm font-medium text-muted-foreground">
                    <span>Questions: {exam._count?.questions || 0}</span>
                    <span>Duration: {exam.duration} mins</span>
                    {hasCompleted && <span className="text-primary mt-2 block">Final Score: {score}%</span>}
                  </div>
                </div>
                {hasCompleted ? (
                  <button
                    disabled
                    className="mt-6 w-full flex justify-center items-center gap-2 rounded-md bg-secondary py-2 text-sm font-semibold text-muted-foreground cursor-not-allowed"
                  >
                    Exam Submitted
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/student/exam/${exam.id}`)}
                    className="mt-6 w-full flex justify-center items-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_10px_rgba(var(--primary),0.3)] hover:shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                  >
                    <Play className="w-4 h-4" /> Start Exam
                  </button>
                )}
              </div>
            );
          })}

          {exams.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
              No exams have been assigned to you yet.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
