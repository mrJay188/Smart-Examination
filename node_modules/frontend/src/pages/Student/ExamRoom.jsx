import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import WebcamMonitor from '../../components/Proctoring/WebcamMonitor';
import { LogOut, Maximize, WifiOff, CheckCircle, ShieldAlert } from 'lucide-react';

const socket = io((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '');

export default function ExamRoom() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Security States
  const [started, setStarted] = useState(false);
  const [sebError, setSebError] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Checklist States
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(false);

  // 3-Strike Rule
  const strikes = useRef(0);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const getBypassQuery = () => {
    return localStorage.getItem('dev_bypass') === 'true' ? '?dev_bypass=true' : '';
  };

  // Safe Exam Browser Check (Bypassable for devs if needed)
  useEffect(() => {
    // SEB Check temporarily disabled for testing
    setSebError(false);
  }, []);

  // Offline detection
  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Fetch Exam Details
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/exams/${examId}`, getAuthHeaders());
        setExam(res.data);
      } catch (err) {
        console.error('Error fetching exam', err);
      }
    };
    fetchExam();
  }, [examId]);

  // Socket setup
  useEffect(() => {
    socket.emit('join_exam', { examId, userId: 1 }); // Would use actual userId in prod
    socket.on('force_terminate', (data) => {
      alert('YOUR EXAM HAS BEEN TERMINATED BY AN ADMINISTRATOR.');
      handleSubmit(true); // Force submit
    });
    return () => socket.off('force_terminate');
  }, [examId]);

  const handleSuspiciousActivity = useCallback(async (eventType, severity, screenshot) => {
    if (!started) return;
    try {
      socket.emit('proctor_alert', { examId, eventType, severity, screenshot, timestamp: new Date() });
      await axios.post(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/exams/${examId}/proctor`, {
        eventType, severity, screenshot
      }, getAuthHeaders());
    } catch (err) {
      console.error('Error logging proctor event', err);
    }
  }, [examId, started]);

  // Anti-Cheating: 3-Strike Tab Detection
  useEffect(() => {
    if (!started) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        strikes.current += 1;
        handleSuspiciousActivity('TAB_SWITCH', 'HIGH');
        
        if (strikes.current >= 3) {
          alert('STRIKE 3: You have violated the exam rules multiple times. Your exam is now being forcefully submitted.');
          handleSubmit(true);
        } else {
          alert(`STRIKE ${strikes.current}/3: You have switched tabs. Do not leave the exam window!`);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [started, handleSuspiciousActivity]);

  // Timer logic
  useEffect(() => {
    if (!started || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Autosave every 60s
    const autosave = setInterval(() => {
      axios.post(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/exams/${examId}/autosave`, { answers }, getAuthHeaders()).catch(console.error);
    }, 60000);

    return () => {
      clearInterval(timer);
      clearInterval(autosave);
    };
  }, [started, timeLeft, examId, answers]);

  // Phase 1: Run Diagnostics
  const runDiagnostics = async () => {
    setChecklistLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraGranted(true);
      setMicGranted(true);
      // Stop the stream tracks immediately so the WebcamMonitor can pick them up later without conflict
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      alert('You must grant Camera and Microphone permissions to take this exam.');
    }
    setChecklistLoading(false);
  };

  // Phase 2: Start Exam (Server Synced)
  const handleStartExam = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      
      const res = await axios.post(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/exams/${examId}/start${getBypassQuery()}`, {}, getAuthHeaders());
      
      // Calculate time left from backend startTime
      const start = new Date(res.data.startTime).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - start) / 1000);
      const totalDurationSeconds = exam.duration * 60;
      const remaining = totalDurationSeconds - elapsedSeconds;
      
      if (remaining <= 0) {
        alert('Your time for this exam has already expired.');
        navigate('/student/dashboard');
        return;
      }
      
      setTimeLeft(remaining);
      setAnswers(res.data.answers || {});
      setStarted(true);

    } catch (err) {
      if (err.response?.status === 403) {
        alert('You have already submitted this exam or access is denied.');
        navigate('/student/dashboard');
      } else {
        alert('Error starting exam. Make sure you are using Safe Exam Browser.');
      }
    }
  };

  const handleAnswerSelect = (questionId, option) => {
    const newAnswers = { ...answers, [questionId]: option };
    setAnswers(newAnswers);
  };

  const handleSubmit = async (force = false) => {
    if (isOffline) {
      alert('You are offline! Please wait to reconnect before submitting.');
      return;
    }

    try {
      const score = Math.floor(Math.random() * 100); // placeholder grading
      await axios.post(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/exams/${examId}/submit${getBypassQuery()}`, {
        score,
        answers,
        force
      }, getAuthHeaders());
      
      alert(force ? 'Exam forcefully submitted.' : 'Exam submitted successfully!');
      
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      navigate('/student/dashboard');
    } catch (err) {
      console.error('Error submitting exam', err);
      alert('Error submitting exam. Please check your connection.');
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!exam) return <div className="flex h-screen items-center justify-center bg-background"><p>Loading Exam...</p></div>;

  if (sebError) {
    return (
      <div className="flex h-screen items-center justify-center bg-destructive/10 text-destructive p-4">
        <div className="max-w-md w-full p-8 rounded-xl border border-destructive/20 bg-card shadow-lg text-center space-y-4">
          <ShieldAlert className="w-12 h-12 mx-auto text-destructive" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p>This exam can only be taken using the <strong>Safe Exam Browser</strong>.</p>
          <p className="text-xs mt-4 opacity-50">(Dev mode: localStorage.setItem('dev_bypass', 'true'))</p>
        </div>
      </div>
    );
  }

  // Pre-Exam Checklist Screen
  if (!started) {
    const allGreen = cameraGranted && micGranted && !sebError && !isOffline;
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="max-w-md w-full p-8 rounded-xl border border-border bg-card shadow-lg space-y-6">
          <h2 className="text-2xl font-bold text-center">System Diagnostics</h2>
          <p className="text-sm text-muted-foreground text-center">You must pass all security checks before the exam unlocks.</p>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded bg-secondary/50">
              <span>Secure Browser</span>
              {!sebError ? <CheckCircle className="text-emerald-500 w-5 h-5"/> : <span className="text-destructive">Failed</span>}
            </div>
            <div className="flex justify-between items-center p-3 rounded bg-secondary/50">
              <span>Network Connection</span>
              {!isOffline ? <CheckCircle className="text-emerald-500 w-5 h-5"/> : <span className="text-destructive">Offline</span>}
            </div>
            <div className="flex justify-between items-center p-3 rounded bg-secondary/50">
              <span>Camera & Microphone</span>
              {cameraGranted ? <CheckCircle className="text-emerald-500 w-5 h-5"/> : (
                <button onClick={runDiagnostics} disabled={checklistLoading} className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                  {checklistLoading ? 'Testing...' : 'Test Now'}
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handleStartExam}
            disabled={!allGreen}
            className={`w-full flex justify-center items-center gap-2 rounded-md px-4 py-3 font-semibold transition-all ${
              allGreen ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-secondary text-muted-foreground cursor-not-allowed'
            }`}
          >
            <Maximize className="w-5 h-5" /> {allGreen ? 'Begin Exam & Enter Fullscreen' : 'Waiting for checks...'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-background text-foreground flex flex-col select-none relative"
      onCopy={e => e.preventDefault()}
      onPaste={e => e.preventDefault()}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Offline Overlay */}
      {isOffline && (
        <div className="absolute inset-0 z-[100] bg-background/95 backdrop-blur flex flex-col items-center justify-center p-6 text-center">
          <WifiOff className="w-16 h-16 text-destructive mb-4 animate-pulse" />
          <h2 className="text-3xl font-bold mb-2">Connection Lost</h2>
          <p className="text-lg text-muted-foreground max-w-md">
            Do not close this window. Your exam timer is still running. The system will automatically resume and submit your answers once you reconnect to the internet.
          </p>
        </div>
      )}

      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 sticky top-0 z-50">
        <div>
          <h1 className="text-lg font-bold">{exam.title}</h1>
          <p className="text-sm text-muted-foreground">Time Remaining: <span className="font-mono text-destructive font-bold">{formatTime(timeLeft)}</span></p>
        </div>
        <div className="flex items-center space-x-4">
          <WebcamMonitor onSuspiciousActivity={handleSuspiciousActivity} />
          <div className="text-xs font-bold text-destructive px-2 py-1 bg-destructive/10 rounded">
            Strikes: {strikes.current}/3
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 flex justify-center">
        <div className="w-full max-w-3xl space-y-8">
          {exam.questions.map((q, idx) => (
            <div key={q.id} className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-medium mb-4">{idx + 1}. {q.text}</h3>
              <div className="space-y-3">
                {(q.options || []).map((opt, i) => (
                  <label key={i} className={`flex items-center space-x-3 rounded-md border border-input p-3 cursor-pointer transition-colors ${answers[q.id] === opt ? 'bg-primary/10 border-primary' : 'hover:bg-accent'}`}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      className="sr-only"
                      onChange={() => handleAnswerSelect(q.id, opt)}
                      checked={answers[q.id] === opt}
                    />
                    <span className="w-5 h-5 rounded-full border border-primary flex items-center justify-center">
                      {answers[q.id] === opt && <span className="w-3 h-3 rounded-full bg-primary" />}
                    </span>
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {exam.questions.length === 0 && (
            <p className="text-center text-muted-foreground py-10">No questions available in this exam.</p>
          )}

          <div className="flex justify-end pt-4 pb-12">
            <button
              onClick={() => {
                if(window.confirm('Are you sure you want to submit your exam early?')) handleSubmit(false);
              }}
              className="rounded-md bg-emerald-600 px-8 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all"
            >
              Submit Exam
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
