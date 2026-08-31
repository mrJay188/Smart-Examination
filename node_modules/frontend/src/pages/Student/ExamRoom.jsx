import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import WebcamMonitor from '../../components/Proctoring/WebcamMonitor';
import { Maximize, WifiOff, CheckCircle, ShieldAlert, ChevronLeft, ChevronRight, AlertTriangle, Send } from 'lucide-react';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

export default function ExamRoom() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Security States
  const [started, setStarted] = useState(false);
  const [sebError, setSebError] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [adminWarning, setAdminWarning] = useState(null);
  
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

  useEffect(() => {
    // SEB Check temporarily disabled for testing
    setSebError(false);
  }, []);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Advanced Keyboard Lockdown
    const handleKeyDown = (e) => {
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+C, Ctrl+V, Alt+Tab (as much as possible in browser)
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || 
        (e.ctrlKey && (e.key === 'U' || e.key === 'c' || e.key === 'v' || e.key === 'x')) ||
        (e.altKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        alert('Security Alert: This action is prohibited during the exam.');
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/exams/${examId}`, getAuthHeaders());
        setExam(res.data);
      } catch (err) {
        console.error('Error fetching exam', err);
      }
    };
    fetchExam();
  }, [examId]);

  useEffect(() => {
    socket.emit('join_exam', { examId, userId: 1 }); // Hardcoded userId 1 for now (should come from token in real app)
    socket.on('force_terminate', () => {
      alert('YOUR EXAM HAS BEEN TERMINATED BY AN ADMINISTRATOR.');
      handleSubmit(true); 
    });
    socket.on('receive_warning', (data) => {
      setAdminWarning(data.message);
    });
    return () => {
      socket.off('force_terminate');
      socket.off('receive_warning');
    };
  }, [examId]);

  const handleSuspiciousActivity = useCallback(async (eventType, severity, screenshot) => {
    if (!started) return;
    try {
      socket.emit('proctor_alert', { examId, eventType, severity, screenshot, timestamp: new Date() });
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/exams/${examId}/proctor`, {
        eventType, severity, screenshot
      }, getAuthHeaders());
    } catch (err) {
      console.error('Error logging proctor event', err);
    }
  }, [examId, started]);

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
    
    const autosave = setInterval(() => {
      axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/exams/${examId}/autosave`, { answers }, getAuthHeaders()).catch(console.error);
    }, 60000);

    return () => {
      clearInterval(timer);
      clearInterval(autosave);
    };
  }, [started, timeLeft, examId, answers]);

  const runDiagnostics = async () => {
    setChecklistLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraGranted(true);
      setMicGranted(true);
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      alert('You must grant Camera and Microphone permissions to take this exam.');
    }
    setChecklistLoading(false);
  };

  const handleStartExam = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/exams/${examId}/start${getBypassQuery()}`, {}, getAuthHeaders());
      
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
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async (force = false) => {
    if (isOffline) {
      alert('You are offline! Please wait to reconnect before submitting.');
      return;
    }
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/exams/${examId}/submit${getBypassQuery()}`, {
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

  if (!exam) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (sebError) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 text-black p-4 font-sans">
        <div className="max-w-md w-full p-8 rounded-2xl border border-black/10 bg-white shadow-xl text-center space-y-4">
          <ShieldAlert className="w-16 h-16 mx-auto text-black" />
          <h2 className="text-2xl font-bold text-black">Security Violation</h2>
          <p className="text-zinc-600">This examination strictly requires the <strong>Safe Exam Browser</strong> to proceed.</p>
        </div>
      </div>
    );
  }

  if (!started) {
    const allGreen = cameraGranted && micGranted && !sebError && !isOffline;
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-zinc-900 font-sans p-6 relative">
        <div className="max-w-lg w-full p-10 rounded-3xl border border-black/10 bg-zinc-50 shadow-xl space-y-8 relative z-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-black">Pre-Exam Diagnostics</h2>
            <p className="text-sm text-zinc-500">Verifying system integrity for <strong className="text-black">{exam.title}</strong></p>
          </div>
          
          <div className="space-y-4">
            <div className={`flex justify-between items-center p-4 rounded-xl border ${!sebError ? 'border-black/20 bg-white shadow-sm' : 'border-black/10 bg-black/5'} transition-colors`}>
              <span className="font-medium text-black">Secure Environment</span>
              {!sebError ? <CheckCircle className="text-black w-5 h-5"/> : <span className="text-zinc-400 text-sm font-bold tracking-wide">FAILED</span>}
            </div>
            <div className={`flex justify-between items-center p-4 rounded-xl border ${!isOffline ? 'border-black/20 bg-white shadow-sm' : 'border-black/10 bg-black/5'} transition-colors`}>
              <span className="font-medium text-black">Network Stability</span>
              {!isOffline ? <CheckCircle className="text-black w-5 h-5"/> : <span className="text-zinc-400 text-sm font-bold tracking-wide">OFFLINE</span>}
            </div>
            <div className={`flex justify-between items-center p-4 rounded-xl border ${cameraGranted ? 'border-black/20 bg-white shadow-sm' : 'border-black/10 bg-black/5'} transition-colors`}>
              <span className="font-medium text-black">Proctoring Hardware</span>
              {cameraGranted ? <CheckCircle className="text-black w-5 h-5"/> : (
                <button onClick={runDiagnostics} disabled={checklistLoading} className="text-xs font-bold uppercase tracking-wider bg-black text-white hover:bg-zinc-800 px-4 py-2 rounded-lg transition-all">
                  {checklistLoading ? 'Initializing...' : 'Run Test'}
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handleStartExam}
            disabled={!allGreen}
            className={`w-full flex justify-center items-center gap-3 rounded-xl px-4 py-4 font-bold tracking-wide transition-all duration-300 ${
              allGreen 
                ? 'bg-black text-white hover:bg-zinc-800 hover:-translate-y-1 shadow-md' 
                : 'bg-black/5 text-zinc-400 cursor-not-allowed border border-black/10'
            }`}
          >
            <Maximize className="w-5 h-5" /> {allGreen ? 'ENTER FOCUS MODE' : 'AWAITING CLEARANCE'}
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const isTimeLow = timeLeft < 300; 

  return (
    <div 
      className="h-screen w-screen bg-zinc-50 text-zinc-900 flex flex-col font-sans overflow-hidden select-none"
      onCopy={e => e.preventDefault()}
      onPaste={e => e.preventDefault()}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Offline Overlay */}
      {isOffline && (
        <div className="absolute inset-0 z-[100] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-black/5 p-6 rounded-full mb-6">
            <WifiOff className="w-20 h-20 text-black animate-pulse" />
          </div>
          <h2 className="text-4xl font-extrabold mb-4 text-black">Connection Severed</h2>
          <p className="text-xl text-zinc-600 max-w-2xl leading-relaxed">
            Do not close or refresh this window. Your local progress is saved, and the timer is running. The system will automatically resume tracking once a connection is re-established.
          </p>
        </div>
      )}

      {/* Admin Warning Overlay */}
      {adminWarning && (
        <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-red-500/20 p-6 rounded-full mb-6 border border-red-500/50">
            <AlertTriangle className="w-20 h-20 text-red-500 animate-pulse" />
          </div>
          <h2 className="text-4xl font-extrabold mb-4 text-white uppercase tracking-widest text-red-500">Live Warning</h2>
          <p className="text-2xl text-white max-w-2xl leading-relaxed font-bold mb-10">
            {adminWarning}
          </p>
          <button onClick={() => setAdminWarning(null)} className="px-10 py-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xl rounded-2xl transition-all hover:scale-105 shadow-2xl">
            I Understand & Comply
          </button>
        </div>
      )}

      {/* Sticky Header */}
      <header className="flex h-20 shrink-0 items-center justify-between border-b border-black/10 bg-white px-8 z-50">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-black tracking-tight">{exam.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold border ${isTimeLow ? 'border-black bg-black text-white animate-pulse' : 'border-black/20 bg-black/5 text-black'}`}>
              <span>⏱</span> {formatTime(timeLeft)}
            </div>
            {strikes.current > 0 && (
              <div className="flex items-center gap-1 text-xs font-bold text-white bg-black px-2 py-1 rounded border border-black">
                <AlertTriangle className="w-3 h-3" /> {strikes.current}/3 Strikes
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="rounded-xl overflow-hidden border-2 border-black/10 shadow-sm bg-zinc-100">
            <WebcamMonitor onSuspiciousActivity={handleSuspiciousActivity} />
          </div>
          <button
            onClick={() => {
              if(window.confirm('Are you certain you want to submit your exam now? This action is irreversible.')) handleSubmit(false);
            }}
            className="flex items-center gap-2 rounded-xl bg-black px-6 py-3 font-bold text-white transition-all hover:bg-zinc-800 hover:-translate-y-0.5 shadow-sm"
          >
            <Send className="w-4 h-4" /> Finalize
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Question Area */}
        <main className="flex-1 flex flex-col items-center p-8 overflow-y-auto relative z-10 bg-zinc-50">
          {exam.questions.length > 0 ? (
            <div className="w-full max-w-4xl mt-8">
              <div className="flex justify-between items-center mb-8">
                <span className="text-sm font-bold uppercase tracking-widest text-zinc-500">Question {currentQuestionIndex + 1} of {exam.questions.length}</span>
              </div>
              
              <div className="bg-white border border-black/10 rounded-3xl p-10 shadow-sm">
                <h3 className="text-2xl font-medium leading-relaxed mb-10 text-black">{currentQuestion?.text}</h3>
                
                <div className="space-y-4">
                  {(currentQuestion?.options || []).map((opt, i) => {
                    const isSelected = answers[currentQuestion.id] === opt;
                    return (
                      <label 
                        key={i} 
                        className={`group flex items-center space-x-4 rounded-2xl border p-5 cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'border-black bg-black/5 shadow-sm' 
                            : 'border-black/10 bg-white hover:bg-zinc-50 hover:border-black/30'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${currentQuestion.id}`}
                          className="sr-only"
                          onChange={() => handleAnswerSelect(currentQuestion.id, opt)}
                          checked={isSelected}
                        />
                        <div className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-black bg-black' : 'border-zinc-300 group-hover:border-zinc-500'}`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className={`text-lg transition-colors ${isSelected ? 'text-black font-semibold' : 'text-zinc-600 group-hover:text-black'}`}>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center mt-12">
                <button
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(prev - 1, 0))}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-white border border-black/10 text-black hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5" /> Previous
                </button>
                <button
                  onClick={() => setCurrentQuestionIndex(prev => Math.min(prev + 1, exam.questions.length - 1))}
                  disabled={currentQuestionIndex === exam.questions.length - 1}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-black text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Next <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-20 text-center text-zinc-500">
              <p>No questions configured for this exam.</p>
            </div>
          )}
        </main>

        {/* Question Palette Sidebar */}
        <aside className="w-80 shrink-0 border-l border-black/10 bg-white flex flex-col z-20 shadow-sm">
          <div className="p-6 border-b border-black/10">
            <h3 className="font-bold text-black mb-1">Question Palette</h3>
            <p className="text-xs text-zinc-500">Navigate to any question instantly.</p>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-5 gap-3">
              {exam.questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = currentQuestionIndex === idx;
                
                let baseStyle = "w-full aspect-square rounded-lg flex items-center justify-center font-bold text-sm transition-all border ";
                
                if (isCurrent) {
                  baseStyle += "bg-black text-white border-black scale-110 shadow-sm";
                } else if (isAnswered) {
                  baseStyle += "bg-zinc-200 text-black border-black/20";
                } else {
                  baseStyle += "bg-white border-black/10 text-zinc-400 hover:border-black/30 hover:text-black";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={baseStyle}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="p-6 border-t border-black/10 bg-zinc-50">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-zinc-600 font-medium">
                <div className="w-4 h-4 rounded bg-zinc-200 border border-black/20"></div> Answered
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-600 font-medium">
                <div className="w-4 h-4 rounded bg-white border border-black/10"></div> Unanswered
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-600 font-medium">
                <div className="w-4 h-4 rounded bg-black border border-black"></div> Current
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
