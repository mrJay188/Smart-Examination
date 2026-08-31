import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, Play, Calendar, CheckCircle, Award, Clock } from 'lucide-react';

export default function StudentDashboard() {
  const [exams, setExams] = useState([]);
  const [userName, setUserName] = useState('Student');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/exams', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setExams(res.data);
        
        const userRes = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/users/me', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if(userRes.data?.name) setUserName(userRes.data.name);
      } catch (err) {
        console.error('Error fetching data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  const completedExams = exams.filter(e => e.results && e.results.length > 0 && ['SUBMITTED', 'FORCE_SUBMITTED'].includes(e.results[0].status));
  const activeExams = exams.filter(e => !e.results || e.results.length === 0 || !['SUBMITTED', 'FORCE_SUBMITTED'].includes(e.results[0].status));
  
  const avgScore = completedExams.length > 0 
    ? Math.round(completedExams.reduce((acc, e) => acc + (e.results[0].score || 0), 0) / completedExams.length)
    : 0;

  return (
    <div className="flex min-h-screen w-full flex-col bg-white text-zinc-900 overflow-x-hidden font-sans">
      
      {/* Navbar */}
      <header className="relative z-10 flex h-20 items-center justify-between border-b border-black/10 bg-white px-8">
        <div className="flex items-center gap-3">
          <div className="bg-black p-2 rounded-xl">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-black">
            Nexus Exam Portal
          </span>
        </div>
        <button
          onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}
          className="flex items-center space-x-2 rounded-lg bg-black/5 px-4 py-2 text-sm font-medium hover:bg-black/10 hover:text-black transition-colors border border-black/10 text-zinc-600"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </header>

      <main className="relative z-10 flex-1 p-6 md:p-12 w-full max-w-7xl mx-auto space-y-12">
        
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-zinc-50 p-10 shadow-sm">
          <div className="absolute inset-0 bg-noise opacity-5 mix-blend-overlay"></div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-black">
                Welcome back, {userName}
              </h1>
              <p className="text-zinc-600 text-lg max-w-xl">
                Ready to showcase your knowledge? You have <strong className="text-black">{activeExams.length}</strong> upcoming exams waiting for you.
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="flex gap-4 w-full md:w-auto">
              <div className="flex-1 md:flex-none flex items-center gap-4 bg-white border border-black/10 rounded-2xl p-4 shadow-sm">
                <div className="p-3 bg-black/5 rounded-xl">
                  <Calendar className="w-6 h-6 text-black" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Upcoming</p>
                  <p className="text-2xl font-bold text-black">{activeExams.length}</p>
                </div>
              </div>
              <div className="flex-1 md:flex-none flex items-center gap-4 bg-white border border-black/10 rounded-2xl p-4 shadow-sm">
                <div className="p-3 bg-black/5 rounded-xl">
                  <Award className="w-6 h-6 text-black" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Avg Score</p>
                  <p className="text-2xl font-bold text-black">{avgScore}%</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* Active Exams Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-black rounded-full"></div>
                <h2 className="text-2xl font-bold tracking-tight text-black">Active Examinations</h2>
              </div>
              
              <div className="grid gap-6 sm:grid-cols-2">
                {activeExams.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-dashed border-black/20 bg-zinc-50 p-12 text-center text-zinc-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
                    You're all caught up! No active exams.
                  </div>
                ) : (
                  activeExams.map((exam) => (
                    <div key={exam.id} className="group relative rounded-2xl border border-black/10 bg-white shadow-sm p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-black/30">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-semibold text-lg line-clamp-2 text-black">{exam.title}</h3>
                        <span className="text-xs font-bold text-white bg-black px-3 py-1 rounded-full whitespace-nowrap">
                          {exam.duration} mins
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500 line-clamp-2 mb-6">{exam.description || 'Standard examination module.'}</p>
                      
                      <button
                        onClick={() => navigate(`/student/exam/${exam.id}`)}
                        className="w-full flex justify-center items-center gap-2 rounded-xl bg-black py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-zinc-800"
                      >
                        <Play className="w-4 h-4 fill-current" /> Initialize Exam
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Past Results Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-zinc-300 rounded-full"></div>
                <h2 className="text-2xl font-bold tracking-tight text-black">Recent History</h2>
              </div>
              
              <div className="space-y-4">
                {completedExams.length === 0 ? (
                  <div className="rounded-2xl border border-black/10 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                    Your completed exams will appear here.
                  </div>
                ) : (
                  completedExams.map((exam) => (
                    <div key={exam.id} className="flex items-center justify-between p-4 rounded-xl border border-black/5 bg-white shadow-sm hover:shadow transition-shadow cursor-default">
                      <div className="flex-1 pr-4">
                        <h4 className="font-medium text-sm text-black line-clamp-1">{exam.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                          <Clock className="w-3 h-3" />
                          <span>Submitted</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-bold text-black">
                          {exam.results[0].score}%
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Score</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
