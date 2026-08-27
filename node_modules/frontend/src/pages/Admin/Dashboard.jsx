import React, { useState, useEffect } from "react";
import axios from "axios";
import { LogOut, Plus, Users, BookOpen, Trash2, Edit, UploadCloud, Link as LinkIcon, AlertTriangle, Search, Key, Filter } from "lucide-react";
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
  const [examForm, setExamForm] = useState({ title: "", description: "", duration: 60, startTime: "", endTime: "", groupId: "" });
  
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
      // Fallback in case old endpoint is hit during transition
      setUsers(res.data);
    }
  };
  const fetchGroups = async () => {
    const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + "/api/groups", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    setGroups(res.data);
  };

  // Re-fetch when filters change
  useEffect(() => {
    fetchUsers(1);
  }, [searchQuery, filterGroupId]);

  // --- Exam Methods ---
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
    setExamForm({ title: "", description: "", duration: 60, startTime: "", endTime: "", groupId: "" });
    fetchExams();
  };
  const startEditExam = (exam) => {
    setEditingExamId(exam.id);
    setExamForm({
      title: exam.title, description: exam.description || "", duration: exam.duration,
      startTime: exam.startTime ? new Date(exam.startTime).toISOString().slice(0,16) : "",
      endTime: exam.endTime ? new Date(exam.endTime).toISOString().slice(0,16) : "",
      groupId: exam.groupId || ""
    });
    setIsCreatingExam(true);
  };
  const handleDeleteExam = async (id) => {
    if (window.confirm("Delete this exam?")) {
      await axios.delete(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000') + ''}/api/exams/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      fetchExams();
    }
  };

  // --- Group Methods ---
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
      fetchUsers(); // Refresh users in case they were in this group
    }
  };
  const handleViewGroupMembers = (groupId) => {
    setFilterGroupId(groupId.toString());
    setActiveTab("students");
  };

  // --- Student Methods ---
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
      fetchGroups(); // Update counts
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

  // Filter logic for students is now handled server-side, 
  // we just use the raw 'users' array from state.
  const filteredUsers = users;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
        <div className="flex items-center gap-2 text-primary">
          <BookOpen className="h-6 w-6" />
          <span className="text-lg font-bold">Admin Portal</span>
        </div>
        <button onClick={() => { localStorage.removeItem("token"); navigate("/login"); }} className="flex items-center space-x-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium hover:bg-secondary/80">
          <LogOut className="h-4 w-4" /> <span>Logout</span>
        </button>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        {/* Tabs */}
        <div className="flex space-x-4 mb-8 border-b border-border pb-4">
          <button onClick={() => setActiveTab("exams")} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === "exams" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>Manage Exams</button>
          <button onClick={() => setActiveTab("groups")} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === "groups" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>Manage Batches (Groups)</button>
          <button onClick={() => setActiveTab("students")} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === "students" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>Student Directory</button>
        </div>

        {/* EXAMS TAB */}
        {activeTab === "exams" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Examinations</h1>
              <button onClick={() => setIsCreatingExam(!isCreatingExam)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold"><Plus className="w-4 h-4"/> New Exam</button>
            </div>
            {isCreatingExam && (
              <form onSubmit={handleSaveExam} className="bg-card p-6 rounded-xl border border-border shadow-sm grid gap-4 md:grid-cols-2">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Exam Title</label>
                  <input required type="text" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={examForm.title} onChange={e => setExamForm({ ...examForm, title: e.target.value })} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Duration (min)</label>
                  <input required type="number" min="1" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={examForm.duration} onChange={e => setExamForm({ ...examForm, duration: e.target.value })} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input required type="datetime-local" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={examForm.startTime} onChange={e => setExamForm({ ...examForm, startTime: e.target.value })} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input required type="datetime-local" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={examForm.endTime} onChange={e => setExamForm({ ...examForm, endTime: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Restrict to Group (Optional)</label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={examForm.groupId} onChange={e => setExamForm({ ...examForm, groupId: e.target.value })}>
                    <option value="">-- Open to all students --</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setIsCreatingExam(false)} className="rounded-md px-4 py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
                  <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Save Exam</button>
                </div>
              </form>
            )}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {exams.map(exam => (
                <div key={exam.id} className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between relative group">
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => startEditExam(exam)} className="text-muted-foreground hover:text-primary"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteExam(exam.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg pr-12">{exam.title}</h3>
                    {exam.group && <span className="inline-block mt-2 px-2 py-1 bg-secondary text-xs font-semibold rounded-md text-secondary-foreground">🔒 {exam.group.name}</span>}
                    <div className="mt-4 flex flex-col space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center"><BookOpen className="mr-2 h-4 w-4" /> <span>Duration: {exam.duration}m</span></div>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/admin/exam/${exam.id}`)} className="mt-6 w-full rounded-md border border-primary text-primary py-2 text-sm font-semibold hover:bg-primary/10 transition-colors">
                    Manage Questions
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GROUPS TAB */}
        {activeTab === "groups" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Cohorts & Batches</h1>
              <button onClick={() => setIsCreatingGroup(!isCreatingGroup)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold"><Plus className="w-4 h-4"/> Create Group</button>
            </div>
            {isCreatingGroup && (
              <form onSubmit={handleSaveGroup} className="bg-card p-6 rounded-xl border border-border shadow-sm grid gap-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium mb-1">Group Name</label>
                  <input required type="text" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. CS-101 Fall 2026" value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsCreatingGroup(false)} className="rounded-md px-4 py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
                  <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Save Group</button>
                </div>
              </form>
            )}
            <div className="grid gap-6 sm:grid-cols-3">
              {groups.map(group => (
                <div key={group.id} className="rounded-xl border border-border bg-card p-6 flex flex-col justify-between shadow-sm relative">
                  <button onClick={() => handleDeleteGroup(group.id)} className="absolute top-4 right-4 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  <div>
                    <h3 className="font-semibold text-lg">{group.name}</h3>
                    <p className="text-sm text-muted-foreground mt-2">{group._count.users} Students</p>
                    <p className="text-sm text-muted-foreground">{group._count.exams} Assigned Exams</p>
                  </div>
                  <button onClick={() => handleViewGroupMembers(group.id)} className="mt-4 w-full rounded-md border border-primary text-primary py-2 text-sm font-semibold hover:bg-primary/10 transition-colors flex items-center justify-center gap-2">
                    <Users className="w-4 h-4" /> View Students
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STUDENTS TAB */}
        {activeTab === "students" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h1 className="text-3xl font-bold">Student Directory</h1>
              <div className="flex gap-2">
                <button onClick={() => { setIsAddingStudent(!isAddingStudent); setIsBulkImport(false); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold hover:bg-primary/90 transition-colors"><Plus className="w-4 h-4"/> New Student</button>
                <button onClick={() => { setIsBulkImport(!isBulkImport); setIsAddingStudent(false); }} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-semibold hover:bg-secondary/80 transition-colors"><UploadCloud className="w-4 h-4"/> Import CSV</button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search by name or email..." 
                  className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="relative w-full sm:w-64">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select 
                  className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
                  value={filterGroupId}
                  onChange={e => setFilterGroupId(e.target.value)}
                >
                  <option value="">All Groups</option>
                  <option value="null">Unassigned</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>

            {isBulkImport && (
              <form onSubmit={handleBulkImport} className="bg-card p-6 rounded-xl border border-border shadow-sm max-w-2xl mb-6">
                <h3 className="font-semibold mb-2">Paste CSV Data</h3>
                <p className="text-xs text-muted-foreground mb-4">Format: name,email,password</p>
                <textarea rows="6" className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-none mb-4" value={csvText} onChange={e => setCsvText(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsBulkImport(false)} className="rounded-md px-4 py-2 text-sm hover:bg-secondary transition-colors">Cancel</button>
                  <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">Import Students</button>
                </div>
              </form>
            )}

            {isAddingStudent && (
              <form onSubmit={handleAddSingleStudent} className="bg-card p-6 rounded-xl border border-border shadow-sm max-w-2xl mb-6 grid gap-4 md:grid-cols-2">
                <div className="col-span-2"><h3 className="font-semibold text-lg">Add New Student</h3></div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input required type="text" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={studentForm.name} onChange={e => setStudentForm({ ...studentForm, name: e.target.value })} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Email Address</label>
                  <input required type="email" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={studentForm.email} onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <input required type="password" minLength="6" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={studentForm.password} onChange={e => setStudentForm({ ...studentForm, password: e.target.value })} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Assign to Group (Optional)</label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={studentForm.groupId} onChange={e => setStudentForm({ ...studentForm, groupId: e.target.value })}>
                    <option value="">-- Unassigned --</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setIsAddingStudent(false)} className="rounded-md px-4 py-2 text-sm hover:bg-secondary transition-colors">Cancel</button>
                  <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">Create Student</button>
                </div>
              </form>
            )}

            <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
              <table className="w-full text-sm text-left">
               <thead className="text-xs uppercase bg-secondary text-secondary-foreground">
                 <tr>
                   <th className="px-6 py-4">Name</th>
                   <th className="px-6 py-4">Group / Batch</th>
                   <th className="px-6 py-4">Status</th>
                   <th className="px-6 py-4 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border">
                 {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link to={`/admin/student/${user.id}`} className="font-medium text-primary hover:underline">{user.name}</Link>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        className="text-sm bg-transparent border-b border-transparent hover:border-input focus:border-primary focus:outline-none px-1 py-1"
                        value={user.group?.id || ""}
                        onChange={(e) => handleChangeGroup(user.id, e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleResetPassword(user.id)} className="text-muted-foreground hover:text-primary p-1.5 rounded-md hover:bg-primary/10 transition-colors" title="Reset Password">
                          <Key className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleStatus(user)} className="text-xs font-medium px-3 py-1.5 border rounded-md hover:bg-secondary transition-colors w-24">
                          {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                 ))}
                 {filteredUsers.length === 0 && (
                   <tr><td colSpan="4" className="text-center py-8 text-muted-foreground border-dashed border-t">No students match the current filters.</td></tr>
                 )}
               </tbody>
             </table>
             {/* Pagination Controls */}
             {pagination.totalPages > 1 && (
               <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-secondary/30">
                 <p className="text-xs text-muted-foreground">Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</p>
                 <div className="flex gap-2">
                   <button 
                     disabled={pagination.page <= 1} 
                     onClick={() => fetchUsers(pagination.page - 1)}
                     className="px-3 py-1 border border-border rounded-md text-xs font-medium bg-card hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     Previous
                   </button>
                   <button 
                     disabled={pagination.page >= pagination.totalPages} 
                     onClick={() => fetchUsers(pagination.page + 1)}
                     className="px-3 py-1 border border-border rounded-md text-xs font-medium bg-card hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
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
