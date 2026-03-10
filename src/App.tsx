import React, { useState, useEffect } from "react";
import { 
  Users, 
  CheckCircle2, 
  History, 
  UserPlus, 
  Search, 
  Calendar as CalendarIcon,
  ChevronRight,
  Plus,
  X,
  Check,
  AlertCircle,
  LayoutDashboard,
  Banknote,
  Coffee,
  Edit,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Student {
  id: number;
  name: string;
  roll_number: string;
  father_name: string;
  father_whatsapp: string;
  fine_paid: number;
  status?: "present" | "absent" | "leave";
}

interface FineRecord {
  id: number;
  name: string;
  roll_number: string;
  fine_paid: number;
  absent_days: number;
}

interface Holiday {
  date: string;
  reason: string;
}

interface HistoryRecord {
  date: string;
  present_count: number;
  absent_count: number;
  leave_count: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "attendance" | "students" | "history" | "fines">("dashboard");
  const [students, setStudents] = useState<Student[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [newStudent, setNewStudent] = useState({ name: "", roll_number: "", father_name: "", father_whatsapp: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<number | null>(null);

  useEffect(() => {
    fetchStudents();
    fetchHistory();
    fetchFines();
    fetchHolidays();
  }, []);

  useEffect(() => {
    if (activeTab === "attendance") {
      fetchAttendanceForDate(selectedDate);
    }
    if (activeTab === "fines") {
      fetchFines();
    }
  }, [selectedDate, activeTab]);

  const fetchHolidays = async () => {
    try {
      const res = await fetch("/api/holidays");
      const data = await res.json();
      setHolidays(data);
    } catch (err) {
      console.error("Failed to fetch holidays", err);
    }
  };

  const toggleHoliday = async () => {
    const isCurrentlyHoliday = isHoliday(selectedDate);
    try {
      if (isCurrentlyHoliday) {
        await fetch(`/api/holidays/${selectedDate}`, { method: "DELETE" });
      } else {
        await fetch("/api/holidays", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: selectedDate, reason: "Off Day" })
        });
      }
      fetchHolidays();
    } catch (err) {
      console.error("Failed to toggle holiday", err);
    }
  };

  const isHoliday = (dateStr: string) => {
    const date = new Date(dateStr);
    // Sunday is 0
    if (date.getDay() === 0) return true;
    return holidays.some(h => h.date === dateStr);
  };

  const fetchFines = async () => {
    try {
      const res = await fetch("/api/fines");
      const data = await res.json();
      setFines(data);
    } catch (err) {
      console.error("Failed to fetch fines", err);
    }
  };

  const updateFinePaid = async (studentId: number, amount: number) => {
    try {
      const res = await fetch("/api/fines/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, fine_paid: amount })
      });
      if (res.ok) {
        fetchFines();
      }
    } catch (err) {
      console.error("Failed to update fine", err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/students");
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error("Failed to fetch students", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  const fetchAttendanceForDate = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/${date}`);
      const data = await res.json();
      // Set default status to 'present' if no record exists
      setStudents(data.map((s: Student) => ({ ...s, status: s.status || "present" })));
    } catch (err) {
      console.error("Failed to fetch attendance", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: number, status: "present" | "absent" | "leave") => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status } : s));
  };

  const submitAttendance = async () => {
    const attendanceData = students.map(s => ({
      student_id: s.id,
      status: s.status || "present"
    }));

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, attendance: attendanceData })
      });
      if (res.ok) {
        alert("Attendance submitted successfully!");
        fetchHistory();
      }
    } catch (err) {
      console.error("Failed to submit attendance", err);
    }
  };

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStudent)
      });
      if (res.ok) {
        setNewStudent({ name: "", roll_number: "", father_name: "", father_whatsapp: "" });
        fetchStudents();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      console.error("Failed to add student", err);
    }
  };

  const updateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingStudent)
      });
      if (res.ok) {
        setEditingStudent(null);
        fetchStudents();
      }
    } catch (err) {
      console.error("Failed to update student", err);
    }
  };

  const deleteStudent = async (id: number) => {
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setStudentToDelete(null);
        fetchStudents();
        fetchFines();
        fetchHistory();
      }
    } catch (err) {
      console.error("Failed to delete student", err);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.roll_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans text-slate-900">
      {/* Sidebar / Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center md:top-0 md:bottom-auto md:flex-col md:w-20 md:h-screen md:border-t-0 md:border-r z-50">
        <button 
          onClick={() => setActiveTab("dashboard")}
          className={`p-3 rounded-2xl transition-all ${activeTab === "dashboard" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:bg-slate-100"}`}
        >
          <LayoutDashboard size={24} />
        </button>
        <button 
          onClick={() => setActiveTab("attendance")}
          className={`p-3 rounded-2xl transition-all ${activeTab === "attendance" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:bg-slate-100"}`}
        >
          <CheckCircle2 size={24} />
        </button>
        <button 
          onClick={() => setActiveTab("students")}
          className={`p-3 rounded-2xl transition-all ${activeTab === "students" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:bg-slate-100"}`}
        >
          <Users size={24} />
        </button>
        <button 
          onClick={() => setActiveTab("history")}
          className={`p-3 rounded-2xl transition-all ${activeTab === "history" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:bg-slate-100"}`}
        >
          <History size={24} />
        </button>
        <button 
          onClick={() => setActiveTab("fines")}
          className={`p-3 rounded-2xl transition-all ${activeTab === "fines" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:bg-slate-100"}`}
        >
          <Banknote size={24} />
        </button>
      </nav>

      {/* Main Content */}
      <main className="md:ml-20 p-6 pb-24 md:pb-6 max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {activeTab === "dashboard" && "Dashboard"}
            {activeTab === "attendance" && "Take Attendance"}
            {activeTab === "students" && "Students Directory"}
            {activeTab === "history" && "Attendance History"}
            {activeTab === "fines" && "Fines Management"}
          </h1>
          <p className="text-slate-500 mt-1">
            {activeTab === "dashboard" && "Overview of today's attendance"}
            {activeTab === "attendance" && "Mark presence for today's session"}
            {activeTab === "students" && "Manage your class members"}
            {activeTab === "history" && "Review past attendance records"}
            {activeTab === "fines" && "Manage student fines for absences"}
          </p>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {isHoliday(selectedDate) ? (
                <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl text-center">
                  <Coffee className="mx-auto text-amber-500 mb-3" size={40} />
                  <h3 className="text-xl font-bold text-amber-900">Today is an Off Day</h3>
                  <p className="text-amber-700 mt-1">No attendance records for today.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-sm font-medium text-slate-500 mb-1">Total Present</p>
                    <h2 className="text-4xl font-bold text-emerald-600">
                      {students.filter(s => s.status === "present").length}
                    </h2>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-sm font-medium text-slate-500 mb-1">Total Absent</p>
                    <h2 className="text-4xl font-bold text-rose-600">
                      {students.filter(s => s.status === "absent").length}
                    </h2>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-sm font-medium text-slate-500 mb-1">Total On Leave</p>
                    <h2 className="text-4xl font-bold text-amber-600">
                      {students.filter(s => s.status === "leave").length}
                    </h2>
                  </div>
                </div>
              )}

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <CalendarIcon size={18} className="text-slate-400" />
                    Today's Summary ({selectedDate})
                  </h3>
                  {!isHoliday(selectedDate) && (
                    <button 
                      onClick={() => setActiveTab("attendance")}
                      className="text-indigo-600 text-sm font-medium hover:underline"
                    >
                      Update Attendance
                    </button>
                  )}
                </div>
                {!isHoliday(selectedDate) && (
                  <>
                    <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-emerald-500 h-full" 
                        style={{ width: `${(students.filter(s => s.status === "present").length / (students.length || 1)) * 100}%` }}
                      />
                      <div 
                        className="bg-rose-500 h-full" 
                        style={{ width: `${(students.filter(s => s.status === "absent").length / (students.length || 1)) * 100}%` }}
                      />
                      <div 
                        className="bg-amber-500 h-full" 
                        style={{ width: `${(students.filter(s => s.status === "leave").length / (students.length || 1)) * 100}%` }}
                      />
                    </div>
                    <div className="flex gap-4 mt-4 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                        <span>Present: {Math.round((students.filter(s => s.status === "present").length / (students.length || 1)) * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-rose-500 rounded-full" />
                        <span>Absent: {Math.round((students.filter(s => s.status === "absent").length / (students.length || 1)) * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-amber-500 rounded-full" />
                        <span>Leave: {Math.round((students.filter(s => s.status === "leave").length / (students.length || 1)) * 100)}%</span>
                      </div>
                    </div>
                  </>
                )}
                {isHoliday(selectedDate) && (
                  <p className="text-sm text-slate-500 italic">No data available for off days.</p>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "attendance" && (
            <motion.div 
              key="attendance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 w-full sm:w-auto">
                  <CalendarIcon size={18} className="text-slate-400" />
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-sm font-medium outline-none"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={toggleHoliday}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isHoliday(selectedDate) ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    <Coffee size={18} />
                    {isHoliday(selectedDate) ? "Mark as Working Day" : "Mark as Off Day"}
                  </button>
                  {!isHoliday(selectedDate) && (
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text"
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  )}
                </div>
              </div>

              {isHoliday(selectedDate) ? (
                <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
                  <Coffee className="mx-auto text-slate-300 mb-4" size={48} />
                  <h3 className="text-lg font-medium text-slate-900">Today is an Off Day</h3>
                  <p className="text-slate-500">Attendance is disabled for Sundays and marked holidays.</p>
                  <button 
                    onClick={toggleHoliday}
                    className="mt-4 text-indigo-600 font-bold hover:underline"
                  >
                    Change to Working Day
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => (
                        <div key={student.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div>
                            <h3 className="font-semibold text-slate-900">{student.name}</h3>
                            <div className="flex flex-col gap-0.5">
                              <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Roll: {student.roll_number}</p>
                              {student.father_name && (
                                <p className="text-[10px] text-slate-400">Father: {student.father_name}</p>
                              )}
                              {student.father_whatsapp && (
                                <p className="text-[10px] text-slate-400">WhatsApp: {student.father_whatsapp}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleStatusChange(student.id, "present")}
                              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${student.status === "present" ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
                            >
                              <Check size={14} />
                              Present
                            </button>
                            <button 
                              onClick={() => handleStatusChange(student.id, "absent")}
                              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${student.status === "absent" ? "bg-rose-100 text-rose-700 ring-1 ring-rose-200" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
                            >
                              <X size={14} />
                              Absent
                            </button>
                            <button 
                              onClick={() => handleStatusChange(student.id, "leave")}
                              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${student.status === "leave" ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
                            >
                              <CalendarIcon size={14} />
                              Leave
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                          <Users className="text-slate-400" size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">No students found</h3>
                        <p className="text-slate-500">Try adding some students in the directory tab.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isHoliday(selectedDate) && filteredStudents.length > 0 && (
                <div className="flex justify-end pt-4">
                  <button 
                    onClick={submitAttendance}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all transform active:scale-95"
                  >
                    Save Attendance
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "students" && (
            <motion.div 
              key="students"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {editingStudent ? (
                <form onSubmit={updateStudent} className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-200 space-y-4 ring-2 ring-indigo-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-indigo-600">
                      <Edit size={20} />
                      <h2 className="font-semibold">Edit Student</h2>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setEditingStudent(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input 
                      type="text"
                      placeholder="Full Name"
                      required
                      value={editingStudent.name}
                      onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <input 
                      type="text"
                      placeholder="Roll Number"
                      required
                      value={editingStudent.roll_number}
                      onChange={(e) => setEditingStudent({ ...editingStudent, roll_number: e.target.value })}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <input 
                      type="text"
                      placeholder="Father's Name"
                      value={editingStudent.father_name}
                      onChange={(e) => setEditingStudent({ ...editingStudent, father_name: e.target.value })}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <input 
                      type="text"
                      placeholder="Father's WhatsApp No"
                      value={editingStudent.father_whatsapp}
                      onChange={(e) => setEditingStudent({ ...editingStudent, father_whatsapp: e.target.value })}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button 
                      type="submit"
                      className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-medium hover:bg-indigo-700 transition-all"
                    >
                      Update Student
                    </button>
                    <button 
                      type="button"
                      onClick={() => setEditingStudent(null)}
                      className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-xl font-medium hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={addStudent} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 text-indigo-600 mb-2">
                    <UserPlus size={20} />
                    <h2 className="font-semibold">Add New Student</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input 
                      type="text"
                      placeholder="Full Name"
                      required
                      value={newStudent.name}
                      onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <input 
                      type="text"
                      placeholder="Roll Number (e.g. CS-101)"
                      required
                      value={newStudent.roll_number}
                      onChange={(e) => setNewStudent({ ...newStudent, roll_number: e.target.value })}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <input 
                      type="text"
                      placeholder="Father's Name"
                      value={newStudent.father_name}
                      onChange={(e) => setNewStudent({ ...newStudent, father_name: e.target.value })}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <input 
                      type="text"
                      placeholder="Father's WhatsApp No"
                      value={newStudent.father_whatsapp}
                      onChange={(e) => setNewStudent({ ...newStudent, father_whatsapp: e.target.value })}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 text-rose-600 text-sm bg-rose-50 p-3 rounded-xl border border-rose-100">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}
                  <button 
                    type="submit"
                    className="w-full bg-slate-900 text-white py-2 rounded-xl font-medium hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Add to Directory
                  </button>
                </form>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-bottom border-slate-100 bg-slate-50/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      placeholder="Search directory..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {students.length > 0 ? (
                    students.filter(s => 
                      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      s.roll_number.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((student) => (
                      <div key={student.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{student.name}</h3>
                            <div className="flex flex-col gap-0.5">
                              <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Roll: {student.roll_number}</p>
                              {student.father_name && (
                                <p className="text-[10px] text-slate-400">Father: {student.father_name}</p>
                              )}
                              {student.father_whatsapp && (
                                <p className="text-[10px] text-slate-400">WhatsApp: {student.father_whatsapp}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {studentToDelete === student.id ? (
                            <div className="flex items-center gap-2 bg-rose-50 p-1 rounded-lg border border-rose-100">
                              <button 
                                onClick={() => deleteStudent(student.id)}
                                className="px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded-md hover:bg-rose-700 transition-all"
                              >
                                Confirm
                              </button>
                              <button 
                                onClick={() => setStudentToDelete(null)}
                                className="px-2 py-1 bg-white text-slate-500 text-[10px] font-bold rounded-md border border-slate-200 hover:bg-slate-50 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={() => setEditingStudent(student)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Edit Student"
                              >
                                <Edit size={18} />
                              </button>
                              <button 
                                onClick={() => setStudentToDelete(student.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Delete Student"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center text-slate-500">
                      No students registered yet.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {history.length > 0 ? (
                history.map((record) => (
                  <div 
                    key={record.date} 
                    className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedDate(record.date);
                      setActiveTab("attendance");
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-100 p-3 rounded-xl text-slate-600">
                        <CalendarIcon size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">
                          {new Date(record.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </h3>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {record.present_count} Present
                          </span>
                          <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                            {record.absent_count} Absent
                          </span>
                          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            {record.leave_count} Leave
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="text-slate-300" size={20} />
                  </div>
                ))
              ) : (
                <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
                  <History className="mx-auto text-slate-300 mb-4" size={48} />
                  <h3 className="text-lg font-medium text-slate-900">No history available</h3>
                  <p className="text-slate-500">Records will appear here once you save attendance.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "fines" && (
            <motion.div 
              key="fines"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-4">Student Name</div>
                  <div className="col-span-2 text-center">Absent Days</div>
                  <div className="col-span-2 text-center">Total Fine (Rs)</div>
                  <div className="col-span-2 text-center">Fine Paid (Rs)</div>
                  <div className="col-span-2 text-center">Remaining (Rs)</div>
                </div>
                <div className="divide-y divide-slate-100">
                  {fines.length > 0 ? (
                    fines.map((record) => {
                      const totalFine = record.absent_days * 20;
                      const remaining = totalFine - record.fine_paid;
                      return (
                        <div key={record.id} className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-slate-50 transition-colors">
                          <div className="col-span-4">
                            <h3 className="font-semibold text-slate-900">{record.name}</h3>
                            <p className="text-[10px] text-slate-400 font-mono uppercase">{record.roll_number}</p>
                          </div>
                          <div className="col-span-2 text-center">
                            <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-sm font-bold text-slate-700">
                              {record.absent_days}
                            </div>
                          </div>
                          <div className="col-span-2 text-center">
                            <div className="inline-block px-3 py-1 bg-rose-50 rounded-lg text-sm font-bold text-rose-600 border border-rose-100">
                              {totalFine}
                            </div>
                          </div>
                          <div className="col-span-2 text-center">
                            <input 
                              type="number"
                              min="0"
                              value={record.fine_paid}
                              onChange={(e) => updateFinePaid(record.id, parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm font-bold text-indigo-600 text-center focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                          </div>
                          <div className="col-span-2 text-center">
                            <div className={`inline-block px-3 py-1 rounded-lg text-sm font-bold border ${remaining > 0 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
                              {remaining}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-12 text-center text-slate-500">
                      No student records found.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
