import React, { useState, useEffect } from "react";
import axios from "axios";
import { LogOut, Plus, Users, BookOpen, Trash2, Edit, UploadCloud, Link as LinkIcon, AlertTriangle, Search, Key, Filter, CheckCircle } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("exams");
  const [exams, setExams] = useState([]);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });
  const [groups, setGroups] = useState([]);
  
  // Search & Filters for Students
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGroupId, setFilterGroupId] = useState("");

  // Forms
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);
  const [examForm, setExamForm] = useState({ title: "", description: "", duration: 60, startTime: "", endTime: "", groupId: "", randomizedQuestionCount: "" });
  
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });
  
  const [isBulkImport, setIsBulkImport] = useState(false);
  const [csvText, setCsvText] = useState("name,email,password\nJohn Doe,john@test.com,pass123");
  
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [studentForm, setStudentForm] = useState({ name: "", email: "", password: "", groupId: "" });

  const navigate = useNavigate();

  useEffect(() => {
    fetchExams();
    fetchUsers();
    fetchGroups();
  }, []);

  const fetchExams = async () => {
    const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + "/api/exams", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    setExams(res.data);
  };
  const fetchUsers = async (page = pagination.page) => {
    let url = `${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/users?page=${page}&limit=${pagination.limit}&search=${encodeURIComponent(searchQuery)}`;
    if (filterGroupId) {
      url += `&groupId=${filterGroupId}`;
    }
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    if (res.data.users) {
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    } else {
      setUsers(res.data);
    }
  };
  const fetchGroups = async () => {
    const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + "/api/groups", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    setGroups(res.data);
  };

  useEffect(() => {
    fetchUsers(1);
  }, [searchQuery, filterGroupId]);

  const handleSaveExam = async (e) => {
    e.preventDefault();
    const payload = { ...examForm, groupId: examForm.groupId || null };
    if (editingExamId) {
      await axios.put(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/exams/${editingExamId}`, payload, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    } else {
      await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:5000') + "/api/exams", payload, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    }
    setIsCreatingExam(false);
    setEditingExamId(null);
    setExamForm({ title: "", description: "", duration: 60, startTime: "", endTime: "", groupId: "", randomizedQuestionCount: "" });
    fetchExams();
  };
  const startEditExam = (exam) => {
    setEditingExamId(exam.id);
    setExamForm({
      title: exam.title, description: exam.description || "", duration: exam.duration,
      startTime: exam.startTime ? new Date(exam.startTime).toISOString().slice(0,16) : "",
      endTime: exam.endTime ? new Date(exam.endTime).toISOString().slice(0,16) : "",
      groupId: exam.groupId || "",
      randomizedQuestionCount: exam.randomizedQuestionCount || ""
    });
    setIsCreatingExam(true);
  };
  const handleDeleteExam = async (id) => {
    if (window.confirm("Delete this exam?")) {
      await axios.delete(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/exams/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      fetchExams();
    }
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:5000') + "/api/groups", groupForm, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    setIsCreatingGroup(false);
    setGroupForm({ name: "", description: "" });
    fetchGroups();
  };
  const handleDeleteGroup = async (id) => {
    if (window.confirm("Delete this group? Users and Exams won't be deleted, just unlinked.")) {
      await axios.delete(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/groups/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      fetchGroups();
      fetchUsers(); 
    }
  };
  const handleViewGroupMembers = (groupId) => {
    setFilterGroupId(groupId.toString());
    setActiveTab("students");
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (window.confirm(`Are you sure you want to change status to ${newStatus}?`)) {
      await axios.put(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/users/${user.id}/status`, { status: newStatus }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      fetchUsers();
    }
  };
  const handleChangeGroup = async (userId, newGroupId) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/users/${userId}/group`, { groupId: newGroupId }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      fetchUsers();
      fetchGroups(); 
    } catch (error) {
      alert("Error updating student's group.");
    }
  };
  const handleResetPassword = async (userId) => {
    const newPassword = window.prompt("Enter the new password for this student:");
    if (newPassword && newPassword.trim().length > 0) {
      try {
        await axios.put(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/users/${userId}/password`, { newPassword }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
        alert("Password reset successfully.");
      } catch (error) {
        alert("Error resetting password.");
      }
    }
  };
  const handleBulkImport = async (e) => {
    e.preventDefault();
    const rows = csvText.trim().split('\n').slice(1);
    const students = rows.map(r => {
      const cols = r.split(',');
      return { name: cols[0], email: cols[1], password: cols[2] };
    });
    
    try {
      await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:5000') + "/api/users/bulk-import", { students }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setIsBulkImport(false);
      fetchUsers();
      fetchGroups();
      alert("Students imported successfully!");
    } catch(err) {
      alert("Error importing students. Ensure emails are unique.");
    }
  };

  const handleAddSingleStudent = async (e) => {
    e.preventDefault();
    try {
      await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:5000') + "/api/users/bulk-import", { students: [studentForm] }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setIsAddingStudent(false);
      setStudentForm({ name: "", email: "", password: "", groupId: "" });
      fetchUsers();
      fetchGroups();
    } catch(err) {
      alert("Error adding student. Email might already exist.");
    }
  };

  const filteredUsers = users;

  return (
    <div className="flex min-h-screen w-full flex-col bg-zinc-50 text-zinc-900 font-sans">
      
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-black/10 bg-white px-8 shadow-sm">
        <div className="flex items-center gap-3 text-black">
          <BookOpen className="h-6 w-6" />
          <span className="text-xl font-bold tracking-tight">Admin Portal</span>
        </div>
        <button 
          onClick={() => { localStorage.removeItem("token"); navigate("/login"); }} 
          className="flex items-center space-x-2 rounded-lg bg-black/5 px-4 py-2 text-sm font-medium hover:bg-black/10 transition-colors border border-black/10 text-zinc-700 hover:text-black"
        >
          <LogOut className="h-4 w-4" /> <span>Logout</span>
        </button>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        
        {/* Navigation Tabs */}
        <div className="flex space-x-2 mb-10 pb-4 border-b border-black/10">
          <button 
            onClick={() => setActiveTab("exams")} 
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${activeTab === "exams" ? "bg-black text-white shadow-md" : "bg-white text-zinc-600 hover:bg-zinc-100 border border-black/5"}`}
          >
            Examinations
          </button>
          <button 
            onClick={() => setActiveTab("groups")} 
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${activeTab === "groups" ? "bg-black text-white shadow-md" : "bg-white text-zinc-600 hover:bg-zinc-100 border border-black/5"}`}
          >
            Cohorts & Batches
          </button>
          <button 
            onClick={() => setActiveTab("students")} 
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${activeTab === "students" ? "bg-black text-white shadow-md" : "bg-white text-zinc-600 hover:bg-zinc-100 border border-black/5"}`}
          >
            Student Directory
          </button>
        </div>

        {/* EXAMS TAB */}
        {activeTab === "exams" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-black/5">
              <div>
                <h1 className="text-2xl font-bold text-black">Active Examinations</h1>
                <p className="text-sm text-zinc-500 mt-1">Manage and monitor all ongoing and upcoming exams.</p>
              </div>
              <button 
                onClick={() => setIsCreatingExam(!isCreatingExam)} 
                className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-bold hover:bg-zinc-800 transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5"/> New Exam
              </button>
            </div>

            {isCreatingExam && (
              <form onSubmit={handleSaveExam} className="bg-white p-8 rounded-3xl border border-black/10 shadow-lg grid gap-6 md:grid-cols-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-black"></div>
                <div className="col-span-2 mb-2">
                  <h3 className="text-xl font-bold text-black">{editingExamId ? 'Edit Examination' : 'Create New Examination'}</h3>
                </div>
                
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-black mb-2">Exam Title</label>
                  <input required type="text" className="w-full rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all" value={examForm.title} onChange={e => setExamForm({ ...examForm, title: e.target.value })} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-black mb-2">Duration (min)</label>
                  <input required type="number" min="1" className="w-full rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all" value={examForm.duration} onChange={e => setExamForm({ ...examForm, duration: e.target.value })} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-black mb-2">Start Time</label>
                  <input required type="datetime-local" className="w-full rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all" value={examForm.startTime} onChange={e => setExamForm({ ...examForm, startTime: e.target.value })} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-black mb-2">End Time</label>
                  <input required type="datetime-local" className="w-full rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all" value={examForm.endTime} onChange={e => setExamForm({ ...examForm, endTime: e.target.value })} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-black mb-2">Restrict to Cohort</label>
                  <select className="w-full rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all" value={examForm.groupId} onChange={e => setExamForm({ ...examForm, groupId: e.target.value })}>
                    <option value="">-- Open to all students --</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-black mb-2">Questions to Serve (Optional)</label>
                  <input type="number" min="1" placeholder="Leave blank to serve all" className="w-full rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all" value={examForm.randomizedQuestionCount} onChange={e => setExamForm({ ...examForm, randomizedQuestionCount: e.target.value })} />
                </div>
                <div className="col-span-2 flex justify-end gap-3 mt-4 border-t border-black/5 pt-6">
                  <button type="button" onClick={() => setIsCreatingExam(false)} className="rounded-xl px-6 py-2.5 text-sm font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors">Cancel</button>
                  <button type="submit" className="rounded-xl bg-black px-6 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 shadow-md transition-all">Save Configuration</button>
                </div>
              </form>
            )}
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {exams.map(exam => (
                <div key={exam.id} className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm flex flex-col justify-between relative group hover:shadow-lg hover:border-black/20 transition-all duration-300">
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEditExam(exam)} className="p-2 bg-zinc-100 hover:bg-black hover:text-white rounded-lg text-zinc-600 transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteExam(exam.id)} className="p-2 bg-red-50 hover:bg-red-500 hover:text-white rounded-lg text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-black pr-16 mb-3">{exam.title}</h3>
                    {exam.group ? (
                      <span className="inline-flex items-center gap-1 mt-1 px-3 py-1 bg-black text-xs font-bold rounded-full text-white">🔒 {exam.group.name}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 mt-1 px-3 py-1 bg-zinc-100 text-xs font-bold rounded-full text-zinc-600">🌐 Public (All Students)</span>
                    )}
                    <div className="mt-6 flex flex-col space-y-2 text-sm text-zinc-500 font-medium">
                      <div className="flex items-center gap-3"><BookOpen className="h-4 w-4 text-black" /> <span>{exam.duration} Minutes</span></div>
                      <div className="flex items-center gap-3"><Users className="h-4 w-4 text-black" /> <span>{exam._count?.questions || 0} Questions</span></div>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/admin/exam/${exam.id}`)} className="mt-8 w-full rounded-xl border-2 border-black text-black py-3 text-sm font-bold hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2">
                    Manage Assessment <LinkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {exams.length === 0 && !isCreatingExam && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-black/10 rounded-3xl bg-zinc-50">
                  <BookOpen className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                  <p className="text-zinc-500 font-medium text-lg">No examinations found.</p>
                  <p className="text-zinc-400 text-sm">Create your first exam to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GROUPS TAB */}
        {activeTab === "groups" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-black/5">
              <div>
                <h1 className="text-2xl font-bold text-black">Cohorts & Batches</h1>
                <p className="text-sm text-zinc-500 mt-1">Organize students into groups for targeted exam assignments.</p>
              </div>
              <button onClick={() => setIsCreatingGroup(!isCreatingGroup)} className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-bold hover:bg-zinc-800 transition-all hover:shadow-lg hover:-translate-y-0.5"><Plus className="w-5 h-5"/> Create Group</button>
            </div>
            
            {isCreatingGroup && (
              <form onSubmit={handleSaveGroup} className="bg-white p-8 rounded-3xl border border-black/10 shadow-lg max-w-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-black"></div>
                <h3 className="text-xl font-bold text-black mb-6">New Cohort</h3>
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Group Name</label>
                  <input required type="text" className="w-full rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all" placeholder="e.g. Computer Science Fall 2026" value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} />
                </div>
                <div className="flex justify-end gap-3 mt-8">
                  <button type="button" onClick={() => setIsCreatingGroup(false)} className="rounded-xl px-6 py-2.5 text-sm font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors">Cancel</button>
                  <button type="submit" className="rounded-xl bg-black px-6 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 shadow-md transition-all">Save Group</button>
                </div>
              </form>
            )}
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map(group => (
                <div key={group.id} className="rounded-2xl border border-black/10 bg-white p-6 flex flex-col justify-between shadow-sm relative group hover:border-black/30 hover:shadow-md transition-all">
                  <button onClick={() => handleDeleteGroup(group.id)} className="absolute top-4 right-4 p-2 bg-zinc-50 hover:bg-red-500 hover:text-white rounded-lg text-zinc-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                  <div>
                    <h3 className="font-bold text-xl text-black">{group.name}</h3>
                    <div className="mt-6 flex flex-col gap-3">
                      <div className="flex items-center gap-3 bg-zinc-50 p-3 rounded-xl border border-black/5">
                        <Users className="w-5 h-5 text-zinc-400" /> 
                        <span className="font-bold text-black">{group._count.users} <span className="font-normal text-zinc-500">Students</span></span>
                      </div>
                      <div className="flex items-center gap-3 bg-zinc-50 p-3 rounded-xl border border-black/5">
                        <BookOpen className="w-5 h-5 text-zinc-400" /> 
                        <span className="font-bold text-black">{group._count.exams} <span className="font-normal text-zinc-500">Exams</span></span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleViewGroupMembers(group.id)} className="mt-6 w-full rounded-xl bg-black text-white py-3 text-sm font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-sm">
                     View Roster
                  </button>
                </div>
              ))}
              {groups.length === 0 && !isCreatingGroup && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-black/10 rounded-3xl bg-zinc-50">
                  <Users className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                  <p className="text-zinc-500 font-medium text-lg">No cohorts configured.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STUDENTS TAB */}
        {activeTab === "students" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-black/5">
              <div>
                <h1 className="text-2xl font-bold text-black">Student Directory</h1>
                <p className="text-sm text-zinc-500 mt-1">Manage accounts, assign batches, and resolve access issues.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => { setIsAddingStudent(!isAddingStudent); setIsBulkImport(false); }} className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-bold hover:bg-zinc-800 transition-all hover:shadow-md"><Plus className="w-5 h-5"/> Single Entry</button>
                <button onClick={() => { setIsBulkImport(!isBulkImport); setIsAddingStudent(false); }} className="flex items-center gap-2 bg-white border border-black text-black px-5 py-2.5 rounded-xl font-bold hover:bg-zinc-100 transition-all"><UploadCloud className="w-5 h-5"/> Bulk Import CSV</button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-zinc-50 p-4 rounded-2xl border border-black/5">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Search by student name or email..." 
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-black/10 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black shadow-sm"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="relative w-full sm:w-72">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <select 
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-black/10 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black shadow-sm appearance-none cursor-pointer"
                  value={filterGroupId}
                  onChange={e => setFilterGroupId(e.target.value)}
                >
                  <option value="">All Cohorts (View All)</option>
                  <option value="null">Unassigned Students</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>

            {isBulkImport && (
              <form onSubmit={handleBulkImport} className="bg-white p-8 rounded-3xl border border-black/10 shadow-lg max-w-3xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-black"></div>
                <h3 className="font-bold text-xl text-black mb-2">Import from CSV</h3>
                <p className="text-sm text-zinc-500 mb-6 bg-zinc-50 p-3 rounded-lg border border-black/5">Format required: <code>name,email,password</code> (First row is ignored as headers)</p>
                <textarea rows="6" className="w-full rounded-xl border border-black/10 bg-zinc-50 p-4 font-mono text-sm focus:ring-2 focus:ring-black focus:outline-none mb-6" value={csvText} onChange={e => setCsvText(e.target.value)} />
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setIsBulkImport(false)} className="rounded-xl px-6 py-2.5 text-sm font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors">Cancel</button>
                  <button type="submit" className="rounded-xl bg-black px-6 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 shadow-md transition-all">Process Import</button>
                </div>
              </form>
            )}

            {isAddingStudent && (
              <form onSubmit={handleAddSingleStudent} className="bg-white p-8 rounded-3xl border border-black/10 shadow-lg relative overflow-hidden grid gap-6 md:grid-cols-2">
                <div className="absolute top-0 left-0 w-1 h-full bg-black"></div>
                <div className="col-span-2 mb-2"><h3 className="font-bold text-xl text-black">Manual Entry</h3></div>
                
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-black mb-2">Full Name</label>
                  <input required type="text" className="w-full rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black" value={studentForm.name} onChange={e => setStudentForm({ ...studentForm, name: e.target.value })} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-black mb-2">Email Address</label>
                  <input required type="email" className="w-full rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black" value={studentForm.email} onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-black mb-2">Initial Password</label>
                  <input required type="password" minLength="6" className="w-full rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black" value={studentForm.password} onChange={e => setStudentForm({ ...studentForm, password: e.target.value })} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-black mb-2">Assign to Cohort</label>
                  <select className="w-full rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black" value={studentForm.groupId} onChange={e => setStudentForm({ ...studentForm, groupId: e.target.value })}>
                    <option value="">-- Unassigned --</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2 flex justify-end gap-3 mt-4 border-t border-black/5 pt-6">
                  <button type="button" onClick={() => setIsAddingStudent(false)} className="rounded-xl px-6 py-2.5 text-sm font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors">Cancel</button>
                  <button type="submit" className="rounded-xl bg-black px-6 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 shadow-md transition-all">Create Account</button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-3xl border border-black/10 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-zinc-50 border-b border-black/10">
                     <th className="px-6 py-5 text-xs font-extrabold text-zinc-500 uppercase tracking-wider">Candidate Profile</th>
                     <th className="px-6 py-5 text-xs font-extrabold text-zinc-500 uppercase tracking-wider">Cohort / Batch</th>
                     <th className="px-6 py-5 text-xs font-extrabold text-zinc-500 uppercase tracking-wider">Account Status</th>
                     <th className="px-6 py-5 text-xs font-extrabold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-black/5">
                   {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <Link to={`/admin/student/${user.id}`} className="font-bold text-black hover:underline text-base">{user.name}</Link>
                            <p className="text-xs text-zinc-500 mt-0.5">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          className="text-sm font-semibold bg-zinc-100 border border-transparent rounded-lg hover:border-black/20 focus:border-black focus:outline-none px-3 py-2 cursor-pointer transition-all w-48"
                          value={user.group?.id || ""}
                          onChange={(e) => handleChangeGroup(user.id, e.target.value)}
                        >
                          <option value="">None (Unassigned)</option>
                          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${user.status === 'ACTIVE' ? 'bg-black text-white border-black' : 'bg-red-50 text-red-600 border-red-200'}`}>
                          {user.status === 'ACTIVE' && <CheckCircle className="w-3 h-3" />}
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleResetPassword(user.id)} className="text-zinc-400 hover:text-black p-2 rounded-lg hover:bg-zinc-100 border border-transparent hover:border-black/10 transition-all" title="Reset Password">
                            <Key className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleToggleStatus(user)} className={`text-xs font-bold px-4 py-2 border rounded-lg transition-all w-28 ${user.status === 'ACTIVE' ? 'bg-white border-black/20 text-black hover:bg-zinc-100' : 'bg-black text-white hover:bg-zinc-800'}`}>
                            {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                   ))}
                   {filteredUsers.length === 0 && (
                     <tr><td colSpan="4" className="text-center py-16 text-zinc-500 font-medium">No candidates found matching the current criteria.</td></tr>
                   )}
                 </tbody>
               </table>
              </div>
              
              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-8 py-4 border-t border-black/10 bg-zinc-50">
                  <p className="text-sm font-medium text-zinc-500">Showing <strong className="text-black">{((pagination.page - 1) * pagination.limit) + 1}</strong> to <strong className="text-black">{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of <strong className="text-black">{pagination.total}</strong> results</p>
                  <div className="flex gap-2">
                    <button 
                      disabled={pagination.page <= 1} 
                      onClick={() => fetchUsers(pagination.page - 1)}
                      className="px-4 py-2 border border-black/20 rounded-xl text-sm font-bold bg-white hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-black shadow-sm"
                    >
                      Previous
                    </button>
                    <button 
                      disabled={pagination.page >= pagination.totalPages} 
                      onClick={() => fetchUsers(pagination.page + 1)}
                      className="px-4 py-2 border border-black/20 rounded-xl text-sm font-bold bg-white hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-black shadow-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
