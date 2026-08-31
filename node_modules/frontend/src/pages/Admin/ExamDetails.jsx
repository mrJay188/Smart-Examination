import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { ArrowLeft, Plus, Trash2, AlertCircle, Edit, Ban, Link as LinkIcon, X, DownloadCloud, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const socket = io((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '');

export default function ExamDetails() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [results, setResults] = useState([]);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [evidenceModal, setEvidenceModal] = useState({ isOpen: false, studentName: '', flags: [] });
  
  // Question Form State
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState('');

  useEffect(() => {
    fetchExamDetails();
    fetchResults();

    socket.emit('join_exam', { examId });
    socket.on('admin_alert', (data) => {
      setLiveAlerts(prev => [data, ...prev].slice(0, 5));
    });

    return () => socket.off('admin_alert');
  }, [examId]);

  const fetchExamDetails = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/exams/${examId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setExam(res.data);
    } catch (err) {
      console.error('Error fetching exam details', err);
    }
  };

  const fetchResults = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/exams/${examId}/results`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setResults(res.data);
    } catch (err) {
      console.error('Error fetching results', err);
    }
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    try {
      const options = qOptions.filter(o => o.trim() !== '');
      if (!options.includes(qCorrect)) {
        alert("The correct answer must exactly match one of the options.");
        return;
      }

      if (editingQuestionId) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/exams/${examId}/questions/${editingQuestionId}`, {
          text: qText,
          options: options,
          correctAnswer: qCorrect
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/exams/${examId}/questions`, {
          text: qText,
          type: 'MCQ',
          options: options,
          correctAnswer: qCorrect
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      
      resetForm();
      fetchExamDetails();
    } catch (err) {
      console.error('Error saving question', err);
    }
  };

  const resetForm = () => {
    setIsAddingQuestion(false);
    setEditingQuestionId(null);
    setQText('');
    setQOptions(['', '', '', '']);
    setQCorrect('');
  };

  const startEditQuestion = (q) => {
    setEditingQuestionId(q.id);
    setQText(q.text);
    const paddedOptions = [...q.options];
    while (paddedOptions.length < 4) paddedOptions.push('');
    setQOptions(paddedOptions);
    setQCorrect(q.correctAnswer);
    setIsAddingQuestion(true);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/exams/${examId}/questions/${questionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchExamDetails();
    } catch (err) {
      console.error('Error deleting question', err);
    }
  };

  const handleGenerateInvite = async (userId) => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/exams/${examId}/invite`, { userId }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert(`Invite Link Generated (Copy to clipboard):\n\n${res.data.inviteUrl}`);
    } catch (error) {
      console.error(error);
      alert('Error generating invite');
    }
  };

  const handleTerminateStudent = (userId) => {
    if (window.confirm("Are you absolutely sure you want to terminate this student's exam immediately?")) {
      socket.emit('terminate_student', { userId });
      alert('Termination command sent to student.');
    }
  };

  const handleSendWarning = (userId) => {
    if (window.confirm("Send a full-screen warning to this student?")) {
      socket.emit('send_warning', { userId });
      alert('Warning sent.');
    }
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Email', 'Score (%)', 'Total Flags'];
    const rows = results.map(r => [
      `"${r.user.name}"`,
      `"${r.user.email}"`,
      r.score,
      r.flags.length
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `results_${exam.title.replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  const scoreDistribution = [
    { range: '0-20%', count: 0 },
    { range: '21-40%', count: 0 },
    { range: '41-60%', count: 0 },
    { range: '61-80%', count: 0 },
    { range: '81-100%', count: 0 },
  ];

  results.forEach(r => {
    if (r.score <= 20) scoreDistribution[0].count++;
    else if (r.score <= 40) scoreDistribution[1].count++;
    else if (r.score <= 60) scoreDistribution[2].count++;
    else if (r.score <= 80) scoreDistribution[3].count++;
    else scoreDistribution[4].count++;
  });

  if (!exam) return (
    <div className="h-screen w-full flex justify-center items-center bg-zinc-50">
      <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 font-sans">
      
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center border-b border-black/10 bg-white px-8 shadow-sm">
        <button 
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center text-sm font-bold text-zinc-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </button>
        <div className="w-px h-6 bg-black/10 mx-6"></div>
        <h1 className="text-xl font-bold text-black truncate">{exam.title}</h1>
        <span className="ml-4 px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-full text-xs font-bold border border-black/5">
          {exam.duration} Minutes
        </span>
      </header>

      <div className="flex-1 p-6 md:p-10 max-w-[1400px] mx-auto w-full grid gap-10 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_500px]">
        
        {/* Left Column: Questions Management */}
        <div className="space-y-8">
          <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-black/5">
            <div>
              <h2 className="text-2xl font-bold text-black">Exam Questions</h2>
              <p className="text-sm text-zinc-500 mt-1">Total questions configured: <strong className="text-black">{exam.questions?.length || 0}</strong></p>
            </div>
            <button 
              onClick={() => { resetForm(); setIsAddingQuestion(true); }}
              className="flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-md hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" /> Add Question
            </button>
          </div>

          {isAddingQuestion && (
            <form onSubmit={handleSaveQuestion} className="rounded-3xl border border-black/10 bg-white p-8 shadow-lg space-y-6 relative overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="absolute top-0 left-0 w-1 h-full bg-black"></div>
              <h3 className="font-bold text-xl text-black">{editingQuestionId ? 'Edit Question' : 'New Question'}</h3>
              <div>
                <label className="block text-sm font-bold mb-2">Question Text</label>
                <textarea
                  required
                  className="w-full rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black min-h-[100px]"
                  value={qText}
                  onChange={e => setQText(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-bold">Multiple Choice Options</label>
                {qOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-zinc-400 uppercase w-6">{(idx + 1).toString().padStart(2, '0')}</span>
                    <input
                      placeholder={`Option ${idx + 1}`}
                      className="w-full rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                      value={opt}
                      onChange={e => {
                        const newOpts = [...qOptions];
                        newOpts[idx] = e.target.value;
                        setQOptions(newOpts);
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <label className="block text-sm font-bold mb-2 text-black">Correct Answer</label>
                <input
                  required
                  placeholder="Must exactly match one of the options above"
                  className="w-full rounded-xl border-2 border-black/20 bg-white px-4 py-3 text-sm font-medium focus:border-black focus:outline-none"
                  value={qCorrect}
                  onChange={e => setQCorrect(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-black/5 mt-6">
                <button type="button" onClick={resetForm} className="rounded-xl px-6 py-2.5 text-sm font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors">Cancel</button>
                <button type="submit" className="rounded-xl bg-black px-6 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 shadow-md transition-all">
                  {editingQuestionId ? 'Update Question' : 'Save Question'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {exam.questions?.map((q, i) => (
              <div key={q.id} className="relative rounded-2xl border border-black/10 bg-white p-6 shadow-sm group transition-all hover:shadow-md hover:border-black/30">
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEditQuestion(q)} className="p-2 bg-zinc-100 hover:bg-black hover:text-white rounded-lg text-zinc-600 transition-colors"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteQuestion(q.id)} className="p-2 bg-red-50 hover:bg-red-500 hover:text-white rounded-lg text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="flex gap-4">
                  <span className="font-extrabold text-2xl text-zinc-200 mt-[-4px]">{(i + 1).toString().padStart(2, '0')}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-base mb-4 pr-16 text-black">{q.text}</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {q.options.map((opt, idx) => (
                        <div key={idx} className={`p-3 rounded-xl border text-sm font-medium ${opt === q.correctAnswer ? 'bg-black text-white border-black' : 'bg-zinc-50 border-black/5 text-zinc-600'}`}>
                          {opt} {opt === q.correctAnswer && ' (Correct)'}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {exam.questions?.length === 0 && !isAddingQuestion && (
              <div className="py-16 border-2 border-dashed border-black/10 rounded-3xl bg-zinc-50 text-center">
                <p className="text-zinc-500 font-medium">No questions added yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Results & Proctoring */}
        <div className="space-y-8">
          
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-3 text-black">
              Live Monitor 
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-40"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-black"></span>
              </span>
            </h2>
            <button onClick={exportToCSV} disabled={results.length === 0} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white border border-black/20 text-black px-4 py-2 rounded-lg hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50">
              <DownloadCloud className="w-4 h-4" /> Export
            </button>
          </div>
          
          {/* Live Alerts Feed */}
          {liveAlerts.length > 0 && (
            <div className="rounded-2xl border-2 border-red-500 bg-white p-5 shadow-lg relative overflow-hidden animate-in slide-in-from-top-2">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
              <h3 className="font-bold text-red-600 flex items-center gap-2 mb-4"><AlertCircle className="w-5 h-5"/> Live AI Alerts</h3>
              <div className="space-y-3">
                {liveAlerts.map((alert, idx) => (
                  <div key={idx} className="flex gap-4 p-3 bg-red-50/50 rounded-xl border border-red-100 text-sm">
                    {alert.screenshot && (
                      <img src={alert.screenshot} alt="Proof" className="w-20 h-14 object-cover rounded-lg border border-red-200" />
                    )}
                    <div>
                      <p className="font-bold text-red-700">{alert.eventType.replace(/_/g, ' ')}</p>
                      <p className="text-red-500/70 text-xs mt-1 font-medium">{alert.severity} RISK • {new Date(alert.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analytics Chart */}
          {results.length > 0 && (
            <div className="rounded-2xl border border-black/10 bg-white shadow-sm p-6">
              <h3 className="font-bold text-sm text-black mb-6">Score Distribution Curve</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreDistribution}>
                    <XAxis dataKey="range" fontSize={11} tickLine={false} axisLine={false} stroke="#a1a1aa" />
                    <Tooltip cursor={{fill: '#f4f4f5'}} contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', backgroundColor: '#fff', color: '#000', fontWeight: 'bold' }} />
                    <Bar dataKey="count" fill="#000" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Submissions Table */}
          <div className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden flex flex-col max-h-[600px]">
             <div className="p-5 border-b border-black/10 bg-zinc-50">
               <h3 className="font-bold text-sm text-black">Recent Submissions ({results.length})</h3>
             </div>
             <div className="overflow-y-auto flex-1">
               <table className="w-full text-sm text-left">
                 <tbody className="divide-y divide-black/5">
                   {results.map((result) => (
                     <tr key={result.id} className="hover:bg-zinc-50 transition-colors">
                       <td className="px-5 py-4">
                          <p className="font-bold text-black">{result.user.name}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{result.user.email}</p>
                       </td>
                       <td className="px-5 py-4 text-center">
                          <span className="text-lg font-extrabold text-black">{result.score}%</span>
                       </td>
                       <td className="px-5 py-4 text-right">
                         {result.flags.length > 0 ? (
                           <div className="flex flex-col items-end gap-2">
                             <button onClick={() => setEvidenceModal({ isOpen: true, studentName: result.user.name, flags: result.flags })} className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors shadow-sm">
                               <AlertCircle className="w-3.5 h-3.5" /> {result.flags.length} Incidents
                             </button>
                             <div className="flex gap-1">
                               <button onClick={() => handleSendWarning(result.userId)} className="p-1.5 text-zinc-400 hover:text-amber-500 hover:bg-amber-50 rounded" title="Send Live Warning"><AlertCircle className="w-4 h-4"/></button>
                               <button onClick={() => handleTerminateStudent(result.userId)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded" title="Terminate Exam"><Ban className="w-4 h-4"/></button>
                               <button onClick={() => handleGenerateInvite(result.userId)} className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded" title="Retake Invite"><LinkIcon className="w-4 h-4"/></button>
                             </div>
                           </div>
                         ) : (
                           <span className="inline-flex items-center gap-1.5 text-xs font-bold text-black bg-zinc-100 px-3 py-1.5 rounded-full border border-black/10">
                             Clean Record
                           </span>
                         )}
                       </td>
                     </tr>
                   ))}
                   {results.length === 0 && (
                     <tr>
                       <td colSpan="3" className="text-center py-10 text-zinc-500 font-medium">Waiting for submissions...</td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      </div>

      {/* AI Evidence Viewer Timeline Modal */}
      {evidenceModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8">
          <div className="bg-white border border-black/20 shadow-2xl rounded-3xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 duration-300">
            
            {/* Header */}
            <div className="p-8 border-b border-black/10 flex justify-between items-center bg-zinc-50 rounded-t-3xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-black"></div>
              <div>
                <h3 className="font-extrabold text-3xl text-black flex items-center gap-3">
                  <AlertCircle className="w-8 h-8"/> 
                  Proctoring Forensics Log
                </h3>
                <p className="text-zinc-500 mt-2 font-medium text-lg">Candidate: <span className="font-bold text-black">{evidenceModal.studentName}</span></p>
              </div>
              <button onClick={() => setEvidenceModal({ isOpen: false, studentName: '', flags: [] })} className="text-zinc-400 hover:text-black p-3 rounded-full hover:bg-black/5 transition-colors border border-transparent hover:border-black/10">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Body - Chronological Timeline */}
            <div className="p-8 overflow-y-auto flex-1 bg-white">
              {evidenceModal.flags.length === 0 ? (
                <div className="flex items-center justify-center h-full text-zinc-400 font-medium text-lg">No incidents recorded.</div>
              ) : (
                <div className="relative pl-8 md:pl-0">
                  {/* Vertical line for desktop */}
                  <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-black/10 -translate-x-1/2"></div>
                  {/* Vertical line for mobile */}
                  <div className="md:hidden absolute left-3 top-0 bottom-0 w-0.5 bg-black/10"></div>
                  
                  <div className="space-y-12 relative">
                    {evidenceModal.flags.map((flag, idx) => {
                      const isEven = idx % 2 === 0;
                      return (
                        <div key={idx} className={`relative flex flex-col md:flex-row items-start md:items-center ${isEven ? 'md:flex-row-reverse' : ''}`}>
                          
                          {/* Timeline Node */}
                          <div className="absolute -left-7 md:left-1/2 md:-translate-x-1/2 top-5 md:top-auto flex items-center justify-center w-6 h-6 rounded-full border-4 border-white bg-black z-10 shadow-sm"></div>

                          {/* Content Card */}
                          <div className={`w-full md:w-[calc(50%-2rem)] ${isEven ? 'md:pl-8' : 'md:pr-8'}`}>
                            <div className="bg-white border border-black/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                              <div className="p-5 border-b border-black/5 flex justify-between items-start bg-zinc-50">
                                <div>
                                  <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2 border ${flag.severity === 'HIGH' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-black text-white border-black'}`}>
                                    {flag.severity} RISK
                                  </span>
                                  <h4 className="font-bold text-lg text-black leading-tight">{flag.eventType.replace(/_/g, ' ')}</h4>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-black">{new Date(flag.timestamp).toLocaleTimeString()}</p>
                                  <p className="text-xs text-zinc-400 font-medium">{new Date(flag.timestamp).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="p-5">
                                {flag.screenshot ? (
                                  <div className="rounded-xl overflow-hidden border border-black/10 bg-black aspect-video relative group cursor-zoom-in">
                                    <img src={flag.screenshot} alt="Evidence" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                  </div>
                                ) : (
                                  <div className="rounded-xl border border-dashed border-black/10 bg-zinc-50 aspect-video flex items-center justify-center text-zinc-400 text-sm font-medium">
                                    No Visual Snapshot
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
