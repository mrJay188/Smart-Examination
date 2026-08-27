import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { ArrowLeft, Plus, Trash2, AlertCircle, Edit, Ban, Link as LinkIcon, X, DownloadCloud } from 'lucide-react';
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

    // Socket.io for live proctoring alerts
    socket.emit('join_exam', { examId });
    socket.on('admin_alert', (data) => {
      setLiveAlerts(prev => [data, ...prev].slice(0, 5)); // Keep last 5 alerts
    });

    return () => socket.off('admin_alert');
  }, [examId]);

  const fetchExamDetails = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/exams/${examId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setExam(res.data);
    } catch (err) {
      console.error('Error fetching exam details', err);
    }
  };

  const fetchResults = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/exams/${examId}/results`, {
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
        await axios.put(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/exams/${examId}/questions/${editingQuestionId}`, {
          text: qText,
          options: options,
          correctAnswer: qCorrect
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/exams/${examId}/questions`, {
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
    // Pad options to 4 inputs
    const paddedOptions = [...q.options];
    while (paddedOptions.length < 4) paddedOptions.push('');
    setQOptions(paddedOptions);
    setQCorrect(q.correctAnswer);
    setIsAddingQuestion(true);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/exams/${examId}/questions/${questionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchExamDetails();
    } catch (err) {
      console.error('Error deleting question', err);
    }
  };

  const handleGenerateInvite = async (userId) => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/exams/${examId}/invite`, { userId }, {
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

  // Prepare data for Score Distribution Chart
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

  if (!exam) return <div className="p-10 flex justify-center text-muted-foreground">Loading Exam Data...</div>;

  return (
    <div className="flex min-h-screen flex-col bg-background p-6 md:p-10">
      <button 
        onClick={() => navigate('/admin/dashboard')}
        className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 w-fit transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{exam.title}</h1>
          <p className="text-muted-foreground mt-1">Duration: {exam.duration} mins</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column: Questions */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Questions ({exam.questions?.length || 0})</h2>
            <button 
              onClick={() => { resetForm(); setIsAddingQuestion(true); }}
              className="flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Question
            </button>
          </div>

          {isAddingQuestion && (
            <form onSubmit={handleSaveQuestion} className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-medium text-lg">{editingQuestionId ? 'Edit Question' : 'New Question'}</h3>
              <div>
                <label className="block text-sm font-medium mb-1">Question Text</label>
                <textarea
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px]"
                  value={qText}
                  onChange={e => setQText(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Options</label>
                {qOptions.map((opt, idx) => (
                  <input
                    key={idx}
                    placeholder={`Option ${idx + 1}`}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={opt}
                    onChange={e => {
                      const newOpts = [...qOptions];
                      newOpts[idx] = e.target.value;
                      setQOptions(newOpts);
                    }}
                  />
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Correct Answer (must match an option)</label>
                <input
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={qCorrect}
                  onChange={e => setQCorrect(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={resetForm} className="rounded-md px-4 py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
                <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  {editingQuestionId ? 'Update Question' : 'Save Question'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {exam.questions?.map((q, i) => (
              <div key={q.id} className="relative rounded-lg border border-border bg-card p-4 group transition-colors hover:border-primary/50">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEditQuestion(q)} className="text-muted-foreground hover:text-primary"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteQuestion(q.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
                <p className="font-medium text-sm mb-2 pr-12">{i + 1}. {q.text}</p>
                <ul className="text-sm text-muted-foreground space-y-1 pl-4 list-disc">
                  {q.options.map((opt, idx) => (
                    <li key={idx} className={opt === q.correctAnswer ? 'text-primary font-semibold' : ''}>
                      {opt} {opt === q.correctAnswer && '(Correct)'}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {exam.questions?.length === 0 && !isAddingQuestion && (
              <p className="text-muted-foreground text-sm text-center py-6 border border-dashed rounded-lg">No questions added yet.</p>
            )}
          </div>
        </div>

        {/* Right Column: Results & Proctoring */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">Live Results & Intervention <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span></span></h2>
            <button onClick={exportToCSV} disabled={results.length === 0} className="flex items-center gap-2 text-sm bg-secondary px-3 py-1.5 rounded-md hover:bg-secondary/80 font-medium transition-colors disabled:opacity-50">
              <DownloadCloud className="w-4 h-4" /> Export CSV
            </button>
          </div>
          
          {/* Live Alerts Feed */}
          {liveAlerts.length > 0 && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 shadow-sm mb-6">
              <h3 className="font-semibold text-destructive flex items-center gap-2 mb-3"><AlertCircle className="w-4 h-4"/> Live Proctoring Alerts</h3>
              <div className="space-y-3">
                {liveAlerts.map((alert, idx) => (
                  <div key={idx} className="flex gap-4 p-3 bg-card rounded-md border border-border text-sm">
                    {alert.screenshot && (
                      <img src={alert.screenshot} alt="Cheating proof" className="w-24 h-16 object-cover rounded bg-muted" />
                    )}
                    <div>
                      <p className="font-bold text-destructive">{alert.eventType}</p>
                      <p className="text-muted-foreground text-xs mt-1">Severity: {alert.severity} | Time: {new Date(alert.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analytics Chart */}
          {results.length > 0 && (
            <div className="rounded-xl border border-border bg-card shadow-sm p-5 mb-6">
              <h3 className="font-semibold mb-4 text-sm text-muted-foreground">Score Distribution</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreDistribution}>
                    <XAxis dataKey="range" fontSize={12} tickLine={false} axisLine={false} stroke="currentColor" className="text-muted-foreground" />
                    <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} stroke="currentColor" className="text-muted-foreground" />
                    <Tooltip cursor={{fill: 'var(--secondary)'}} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }} />
                    <Bar dataKey="count" fill="currentColor" className="text-primary" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="text-xs uppercase bg-secondary text-secondary-foreground">
                 <tr>
                   <th className="px-4 py-3 rounded-tl-md">Student</th>
                   <th className="px-4 py-3">Score</th>
                   <th className="px-4 py-3">AI Flags</th>
                   <th className="px-4 py-3 rounded-tr-md">Intervention</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border">
                 {results.map((result) => (
                   <tr key={result.id} className="hover:bg-accent/50 transition-colors">
                     <td className="px-4 py-3">
                        <p className="font-medium">{result.user.name}</p>
                        <p className="text-xs text-muted-foreground">{result.user.email}</p>
                     </td>
                     <td className="px-4 py-3 font-semibold">{result.score}%</td>
                     <td className="px-4 py-3">
                       {result.flags.length > 0 ? (
                         <div className="flex flex-col gap-1">
                           <button onClick={() => setEvidenceModal({ isOpen: true, studentName: result.user.name, flags: result.flags })} className="inline-flex items-center w-fit gap-1 text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-full hover:bg-destructive/20 transition-colors cursor-pointer border-none text-left">
                             <AlertCircle className="w-3 h-3" /> {result.flags.length} Flags (View Proof)
                           </button>
                         </div>
                       ) : (
                         <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">Clean</span>
                       )}
                     </td>
                     <td className="px-4 py-3">
                       <div className="flex gap-2">
                         <button onClick={() => handleTerminateStudent(result.userId)} className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors" title="Terminate Exam">
                           <Ban className="w-4 h-4" />
                         </button>
                         <button onClick={() => handleGenerateInvite(result.userId)} className="text-primary hover:bg-primary/10 p-2 rounded-md transition-colors" title="Generate Retake Invite Link">
                           <LinkIcon className="w-4 h-4" />
                         </button>
                       </div>
                     </td>
                   </tr>
                 ))}
                 {results.length === 0 && (
                   <tr>
                     <td colSpan="4" className="text-center py-8 text-muted-foreground border-dashed border-t">No students have submitted this exam yet.</td>
                   </tr>
                 )}
               </tbody>
             </table>
          </div>
        </div>
      </div>

      {/* AI Evidence Viewer Modal */}
      {evidenceModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/30 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-2xl flex items-center gap-2"><AlertCircle className="w-6 h-6 text-destructive"/> AI Evidence Log</h3>
                <p className="text-muted-foreground mt-1">Student: <span className="font-semibold text-foreground">{evidenceModal.studentName}</span></p>
              </div>
              <button onClick={() => setEvidenceModal({ isOpen: false, studentName: '', flags: [] })} className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-secondary transition-colors bg-background border border-border shadow-sm">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-secondary/10">
              {evidenceModal.flags.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">No evidence recorded.</div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {evidenceModal.flags.map((flag, idx) => (
                    <div key={idx} className="border border-border rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col">
                      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-border">
                        {flag.screenshot ? (
                          <img src={flag.screenshot} alt="Cheating Proof" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                        ) : (
                          <span className="text-muted-foreground text-sm">No Snapshot Available</span>
                        )}
                        <div className="absolute top-3 right-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${flag.severity === 'HIGH' ? 'bg-destructive/90 text-white' : 'bg-amber-500/90 text-white'}`}>
                            {flag.severity} RISK
                          </span>
                        </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                        <div>
                          <p className="font-bold text-destructive text-lg leading-tight">{flag.eventType.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-muted-foreground mt-1">Automated AI Detection Flag</p>
                        </div>
                        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground pt-4 border-t border-border">
                          <span>{new Date(flag.timestamp).toLocaleDateString()}</span>
                          <span>{new Date(flag.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
