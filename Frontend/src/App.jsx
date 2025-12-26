import { useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import { Download, Calendar, Users, ShieldCheck, Trophy, FileText, X, LayoutGrid } from "lucide-react";
import * as XLSX from "xlsx";
import api from "./api";
import MonthlyReportModal from "./components/MonthlyReportModal";
import StaffVerificationModal from "./components/StaffVerificationModal";
import Loader from "./components/Loader";
import Toast from "./components/Toast";
import './select.css';

export default function App() {
  const [studentStats, setStudentStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info", visible: false });
  const [popupOpen, setPopupOpen] = useState(false);
  const [roundsOpen, setRoundsOpen] = useState(false);
  const [monthlyReportOpen, setMonthlyReportOpen] = useState(false);
  const [selectedClassName, setSelectedClassName] = useState("");
  const [selectedBatchYear, setSelectedBatchYear] = useState("");
  const [reportBatchYear, setReportBatchYear] = useState("");
  const [reportClassName, setReportClassName] = useState("");
  const [rankings, setRankings] = useState([]);
  const [loadingRankings, setLoadingRankings] = useState(false);
  const [distinctBatchYears, setDistinctBatchYears] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [reportClassOptions, setReportClassOptions] = useState([]);

  // Verification State
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [isVerified, setIsVerified] = useState(false);


  // Rankings fetch
  useEffect(() => {
    const loadRankings = async () => {
      // Only run if rounds modal is open AND a batch/year is selected
      if (!roundsOpen || !selectedBatchYear || selectedBatchYear === "") {
        setRankings([]);
        return;
      }

      try {
        setLoadingRankings(true);

        const classParam =
          selectedClassName === "" || selectedClassName === "all"
            ? undefined
            : selectedClassName;
        const batchParam =
          selectedBatchYear === "" || selectedBatchYear === "all"
            ? undefined
            : selectedBatchYear;

        // Build URL only if at least one param exists
        let url = "/rounds?";
        if (batchParam) url += `batchYear=${batchParam}&`;
        if (classParam) url += `className=${classParam}`;

        const res = await api.get(url);
        const students = res.data || [];

        const rows = students
          .map((student) => {
            let easy = 0, medium = 0, hard = 0, total = 0;
            if (student.statsHistory?.length) {
              const last = student.statsHistory[student.statsHistory.length - 1];
              easy = last.easy;
              medium = last.medium;
              hard = last.hard;
              total = last.total;
            }
            return {
              rollNo: student.rollNo,
              name: student.name,
              leetcodeLink: student.leetcodeLink || "-",
              easy,
              medium,
              hard,
              total,
            };
          })
          .sort((a, b) => b.total - a.total)
          .map((row, idx) => ({ ...row, rank: idx + 1 }));

        setRankings(rows);
      } catch (err) {
        console.error("Error loading rankings:", err);
        setRankings([]);
      } finally {
        setLoadingRankings(false);
      }
    };

    loadRankings();
  }, [roundsOpen, selectedClassName, selectedBatchYear]);



  // Reset class when batch changes (for View Rankings)
  useEffect(() => {
    setSelectedClassName("");
    let classes = [];
    if (selectedBatchYear === "" || selectedBatchYear === "all") {
      classes = ['A', 'B', 'C', 'D'];
    } else if (parseInt(selectedBatchYear) >= 2025) {
      classes = ['A', 'B', 'C', 'D'];
    } else {
      classes = ['A', 'B', 'C'];
    }
    setClassOptions(classes);
  }, [selectedBatchYear]);

  // Reset class when report batch changes
  useEffect(() => {
    setReportClassName("");
    let classes = [];
    if (reportBatchYear === "") {
      classes = [];
    } else if (parseInt(reportBatchYear) >= 2025) {
      classes = ['A', 'B', 'C', 'D'];
    } else {
      classes = ['A', 'B', 'C'];
    }
    setReportClassOptions(classes);
  }, [reportBatchYear]);


  // Distinct batch years fetch
  useEffect(() => {
    const fetchDistinct = async () => {
      try {
        setLoading(true);
        const res = await api.get("/staffs/distinct");
        setDistinctBatchYears(res.data?.batchYears || []);
      } catch (err) {
        console.error("Error fetching distinct staff values:", err);
        setToast({ message: "Failed to load batch years", type: "error", visible: true });
      } finally {
        setLoading(false);
      }
    };
    fetchDistinct();
  }, []);



  // Fetch student stats
  const fetchStudentStats = async () => {
    if (!reportBatchYear && !reportClassName) {
      setToast({ message: "Please select a batch year and section", type: "error", visible: true });
      return;
    }
    if (!reportBatchYear) {
      setToast({ message: "Please select a batch year", type: "error", visible: true });
      return;
    }
    if (!reportClassName) {
      setToast({ message: "Please select a section", type: "error", visible: true });
      return;
    }

    // Check verification
    if (!isVerified) {
      setVerificationOpen(true);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/report/${reportBatchYear}/${reportClassName}`);
      const students = res.data;
      const stats = students.map((student, index) => {
        let prev = { easy: "-", medium: "-", hard: "-", total: "-", date: "-" };
        let curr = { easy: "-", medium: "-", hard: "-", total: "-", date: "-" };
        if (student.statsHistory && student.statsHistory.length > 0) {
          const history = student.statsHistory;
          if (history.length === 1) {
            curr = {
              easy: history[0].easy,
              medium: history[0].medium,
              hard: history[0].hard,
              total: history[0].total,
              date: new Date(history[0].date).toLocaleDateString(),
            };
          } else if (history.length >= 2) {
            prev = {
              easy: history[history.length - 2].easy,
              medium: history[history.length - 2].medium,
              hard: history[history.length - 2].hard,
              total: history[history.length - 2].total,
              date: new Date(
                history[history.length - 2].date
              ).toLocaleDateString(),
            };
            curr = {
              easy: history[history.length - 1].easy,
              medium: history[history.length - 1].medium,
              hard: history[history.length - 1].hard,
              total: history[history.length - 1].total,
              date: new Date(
                history[history.length - 1].date
              ).toLocaleDateString(),
            };
          }
        }
        return {
          sNo: index + 1,
          rollNo: student.rollNo,
          registerNo: student.registerNo,
          name: student.name,
          leetcodeLink: student.leetcodeLink || "-",
          prev,
          curr,
          improvement: prev.total !== "-" ? curr.total - prev.total : "-",
        };
      });
      setStudentStats(stats);
      setPopupOpen(true);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setToast({ message: "Failed to fetch student stats", type: "error", visible: true });
    } finally {
      setLoading(false);
    }
  };

  // Handle Verification
  const handleVerification = (selectedVerifier, verifierPassword) => {
    const passwords = {
      "Mr. G. Vinoth Chakkaravarthy": "CSE0907",
      "Mr. G. BalamuraliKrishnan": "CSE2264",
      "Mrs. A. Benazir Begum": "CSE2482",
      "Mrs. R. Pavithra": "CSE2478",
    };

    if (passwords[selectedVerifier] === verifierPassword) {
      setVerificationOpen(false);
      setVerificationError("");
      setIsVerified(true);
      // Automatically fetch stats after successful verification
      if (reportBatchYear && reportClassName) {
        fetchStudentStatsCore();
      }
    } else {
      setVerificationError("Invalid credentials");
    }
  };

  const fetchStudentStatsCore = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/report/${reportBatchYear}/${reportClassName}`);
      const students = res.data;
      const stats = students.map((student, index) => {
        let prev = { easy: "-", medium: "-", hard: "-", total: "-", date: "-" };
        let curr = { easy: "-", medium: "-", hard: "-", total: "-", date: "-" };
        if (student.statsHistory && student.statsHistory.length > 0) {
          const history = student.statsHistory;
          if (history.length === 1) {
            curr = {
              easy: history[0].easy,
              medium: history[0].medium,
              hard: history[0].hard,
              total: history[0].total,
              date: new Date(history[0].date).toLocaleDateString(),
            };
          } else if (history.length >= 2) {
            prev = {
              easy: history[history.length - 2].easy,
              medium: history[history.length - 2].medium,
              hard: history[history.length - 2].hard,
              total: history[history.length - 2].total,
              date: new Date(
                history[history.length - 2].date
              ).toLocaleDateString(),
            };
            curr = {
              easy: history[history.length - 1].easy,
              medium: history[history.length - 1].medium,
              hard: history[history.length - 1].hard,
              total: history[history.length - 1].total,
              date: new Date(
                history[history.length - 1].date
              ).toLocaleDateString(),
            };
          }
        }
        return {
          sNo: index + 1,
          rollNo: student.rollNo,
          registerNo: student.registerNo,
          name: student.name,
          leetcodeLink: student.leetcodeLink || "-",
          prev,
          curr,
          improvement: prev.total !== "-" ? curr.total - prev.total : "-",
        };
      });
      setStudentStats(stats);
      setPopupOpen(true);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setToast({ message: "Failed to fetch student stats", type: "error", visible: true });
    } finally {
      setLoading(false);
    }
  }

  // Download Excel
  const handleDownload = () => {
    if (!reportBatchYear || !reportClassName || studentStats.length === 0) return;
    const prevDate = studentStats[0]?.prev.date || "-";
    const currDate = studentStats[0]?.curr.date || "-";
    const header1 = [
      "S.No.",
      "Roll No.",
      "Register No.",
      "Name",
      "LeetCode Link",
      `Previous Report (${prevDate})`,
      "",
      "",
      "",
      `Current Report (${currDate})`,
      "",
      "",
      "",
      "Improvement",
    ];
    const header2 = [
      "",
      "",
      "",
      "",
      "",
      "Easy",
      "Medium",
      "Hard",
      "Total",
      "Easy",
      "Medium",
      "Hard",
      "Total",
      "",
    ];
    const sheetData = [
      header1,
      header2,
      ...studentStats.map((s) => [
        s.sNo,
        s.rollNo,
        s.registerNo,
        s.name,
        s.leetcodeLink,
        s.prev.easy,
        s.prev.medium,
        s.prev.hard,
        s.prev.total,
        s.curr.easy,
        s.curr.medium,
        s.curr.hard,
        s.curr.total,
        s.improvement,
      ]),
    ];
    for (let i = 0; i < 5; i++) sheetData.push([]);
    const signatureRowIndex = sheetData.length;
    sheetData.push([
      "",
      "Placement Coordinator Signature",
      "",
      "",
      "Head of the Department Signature",
      "",
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    worksheet["!merges"] = [
      { s: { r: 0, c: 5 }, e: { r: 0, c: 8 } },
      { s: { r: 0, c: 9 }, e: { r: 0, c: 12 } },
      { s: { r: signatureRowIndex, c: 1 }, e: { r: signatureRowIndex, c: 3 } },
      { s: { r: signatureRowIndex, c: 4 }, e: { r: signatureRowIndex, c: 6 } },
    ];
    worksheet["!cols"] = Array(header2.length).fill({ wch: 18 });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "LeetCode Stats");
    const date = new Date().toISOString().split("T")[0];
    const fileName = `${reportBatchYear}-CSE-${reportClassName}-${date}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col p-6">
      <header className="w-full flex items-center justify-between mb-10">
        <img src="/vcet-logo.jpg" alt="VCET Logo" className="h-16 w-auto object-contain" />
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900"> Velammal College of Engineering and Technology </h1>
          <p className="text-lg font-medium text-gray-700"> Department of Computer Science & Engineering </p>
        </div>
        <img src="/cse-logo.jpg" alt="CSE Logo" className="h-16 w-auto object-contain" />
      </header>

      {/* Global Loader & Toast */}
      {loading && <Loader />}
      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        />
      )}
      <div className="flex-1 flex items-center justify-center">
        <Motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-xl bg-white border border-gray-100 rounded-3xl shadow-2xl p-8 sm:p-10 flex flex-col items-center justify-center"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-black p-1.5 rounded-2xl">
              <img
                src="/leetcode-logo.png"
                alt="LeetCode Logo"
                className="w-10 h-10 object-contain"
              />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight"> LeetCode Stats Report </h2>
          </div>

          <form className="space-y-6 w-full flex flex-col items-center">
            <div className="w-full relative group">
              <label className="flex items-center text-sm font-bold text-gray-700 mb-2 ml-1">
                <Calendar size={16} className="mr-2 text-blue-500" />
                Batch Year
              </label>
              <select
                className="w-full appearance-none rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-4 text-sm font-semibold text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                value={reportBatchYear}
                onChange={(e) => setReportBatchYear(e.target.value)}
              >
                <option value="">Select Batch Year</option>
                {[...distinctBatchYears]
                  .filter(Boolean)
                  .sort((a, b) => a - b)
                  .map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
              </select>
              <div className="absolute right-4 bottom-4 pointer-events-none text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="w-full relative group">
              <label className="flex items-center text-sm font-bold text-gray-700 mb-2 ml-1">
                <Users size={16} className="mr-2 text-purple-500" />
                Section
              </label>
              <select
                className="w-full appearance-none rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-4 text-sm font-semibold text-gray-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                value={reportClassName}
                onChange={(e) => setReportClassName(e.target.value)}
                disabled={!reportBatchYear}
              >
                <option value="">Select Section</option>
                {reportClassOptions.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              <div className="absolute right-4 bottom-4 pointer-events-none text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <Motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              disabled={loading}
              onClick={fetchStudentStats}
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-gray-900 text-white py-4 font-bold shadow-xl shadow-gray-900/20 disabled:opacity-50 transition-all duration-300 active:scale-95"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating...</span>
                </div>
              ) : (
                <>
                  <FileText size={20} />
                  <span>Generate Report</span>
                </>
              )}
            </Motion.button>

            <div className="grid grid-cols-2 gap-4 w-full">
              <Motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setRoundsOpen(true)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 text-white py-4 text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all duration-300 active:scale-95"
              >
                <Trophy size={18} />
                <span>View Rankings</span>
              </Motion.button>

              <Motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setMonthlyReportOpen(true)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-purple-600 text-white py-4 text-sm font-bold hover:bg-purple-700 shadow-lg shadow-purple-600/20 transition-all duration-300 active:scale-95"
              >
                <Calendar size={18} />
                <span>Monthly Report</span>
              </Motion.button>
            </div>
          </form>
        </Motion.div>
      </div>

      <StaffVerificationModal
        isOpen={verificationOpen}
        onClose={() => {
          setVerificationOpen(false);
          setVerificationError("");
        }}
        onVerify={handleVerification}
        error={verificationError}
        setError={setVerificationError}
      />

      {popupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-8">
          <Motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-[95vw] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-xl">
                  <FileText size={24} className="text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Student Performance Report</h2>
                  <p className="text-sm text-gray-500 font-medium">Detailed breakdown of LeetCode progress</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all active:scale-95"
                >
                  <Download size={18} /> Export to Excel
                </button>
                <button
                  onClick={() => setPopupOpen(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-auto custom-scrollbar">
              <div className="ring-1 ring-gray-100 rounded-3xl overflow-hidden shadow-sm">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th rowSpan="2" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100">S.No.</th>
                      <th rowSpan="2" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100">Roll No.</th>
                      <th rowSpan="2" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100">Register No.</th>
                      <th rowSpan="2" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100">Name</th>
                      <th rowSpan="2" className="px-6 py-5 text-center text-xs font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100">LeetCode</th>
                      <th colSpan="4" className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 border-r border-gray-100 bg-gray-100/30">Previous Report ({studentStats[0]?.prev.date || "-"})</th>
                      <th colSpan="4" className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 border-r border-gray-100 bg-gray-100/30">Current Report ({studentStats[0]?.curr.date || "-"})</th>
                      <th rowSpan="2" className="px-6 py-5 text-center text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Improvement</th>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider border-r border-gray-100">Easy</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider border-r border-gray-100">Med</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider border-r border-gray-100">Hard</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-600 uppercase tracking-wider border-r border-gray-100 bg-gray-100/50">Total</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider border-r border-gray-100">Easy</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider border-r border-gray-100">Med</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider border-r border-gray-100">Hard</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-600 uppercase tracking-wider border-r border-gray-100 bg-gray-100/50">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {studentStats.map((s, idx) => (
                      <tr key={s.rollNo} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-6 py-4 text-sm font-bold text-gray-400 border-r border-gray-50">{s.sNo}</td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 border-r border-gray-50">{s.rollNo}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500 border-r border-gray-50">{s.registerNo}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 border-r border-gray-50">{s.name}</td>
                        <td className="px-6 py-4 text-sm text-center border-r border-gray-50">
                          {s.leetcodeLink !== "-" ? (
                            <a href={s.leetcodeLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold transition-colors">
                              View <LayoutGrid size={14} />
                            </a>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-center text-gray-500 border-r border-gray-50">{s.prev.easy}</td>
                        <td className="px-4 py-4 text-sm text-center text-gray-500 border-r border-gray-50">{s.prev.medium}</td>
                        <td className="px-4 py-4 text-sm text-center text-gray-500 border-r border-gray-50">{s.prev.hard}</td>
                        <td className="px-4 py-4 text-sm text-center font-black text-gray-900 border-r border-gray-50 bg-gray-50/50">{s.prev.total}</td>
                        <td className="px-4 py-4 text-sm text-center text-gray-500 border-r border-gray-50">{s.curr.easy}</td>
                        <td className="px-4 py-4 text-sm text-center text-gray-500 border-r border-gray-50">{s.curr.medium}</td>
                        <td className="px-4 py-4 text-sm text-center text-gray-500 border-r border-gray-50">{s.curr.hard}</td>
                        <td className="px-4 py-4 text-sm text-center font-black text-gray-900 border-r border-gray-50 bg-gray-50/50">{s.curr.total}</td>
                        <td className="px-6 py-4 text-center whitespace-nowrap border-l border-gray-50">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${s.improvement > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                            }`}>
                            {s.improvement > 0 ? `+${s.improvement}` : s.improvement}
                          </span>
                        </td>
                      </tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          </Motion.div>
        </div>)}
      {roundsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-8">
          <Motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-[95vw] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-xl">
                  <Trophy size={24} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">LeetCode Rankings</h2>
                  <p className="text-sm text-gray-500 font-medium">Top performers across batches and classes</p>
                </div>
              </div>
              <button
                onClick={() => setRoundsOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-900"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="relative group">
                  <label className="flex items-center text-sm font-bold text-gray-700 mb-2 ml-1">
                    <Calendar size={16} className="mr-2 text-blue-500" />
                    Batch Year
                  </label>
                  <select
                    className="w-full appearance-none rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                    value={selectedBatchYear}
                    onChange={(e) => setSelectedBatchYear(e.target.value)}
                  >
                    <option value="">Select Batch</option>
                    <option value="all">All Batches</option>
                    {[...distinctBatchYears]
                      .filter(Boolean)
                      .sort((a, b) => a - b)
                      .map((yr) => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                  </select>
                  <div className="absolute right-4 bottom-3.5 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div className="relative group">
                  <label className="flex items-center text-sm font-bold text-gray-700 mb-2 ml-1">
                    <Users size={16} className="mr-2 text-purple-500" />
                    Class
                  </label>
                  <select
                    className="w-full appearance-none rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    value={selectedClassName}
                    onChange={(e) => setSelectedClassName(e.target.value)}
                  >
                    <option value="">Select Class</option>
                    {classOptions.map((cls) => (
                      <option key={cls} value={cls === 'All Classes' ? 'all' : cls}>{cls}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 bottom-3.5 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="ring-1 ring-gray-100 rounded-3xl overflow-hidden shadow-sm">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100">Rank</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100">Roll No.</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100">Name</th>
                      <th className="px-6 py-5 text-center text-xs font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100">LeetCode</th>
                      <th className="px-4 py-5 text-center text-xs font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100">Easy</th>
                      <th className="px-4 py-5 text-center text-xs font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100">Med</th>
                      <th className="px-4 py-5 text-center text-xs font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100">Hard</th>
                      <th className="px-6 py-5 text-center text-xs font-bold text-gray-600 uppercase tracking-widest bg-gray-100/50">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {loadingRankings ? (
                      <tr>
                        <td className="px-6 py-20 text-center" colSpan="8">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-500 font-bold">Calculating rankings...</p>
                          </div>
                        </td>
                      </tr>
                    ) : rankings.length === 0 ? (
                      <tr>
                        <td className="px-6 py-20 text-center" colSpan="8">
                          <div className="flex flex-col items-center justify-center text-gray-400">
                            <LayoutGrid size={48} className="mb-4 opacity-20" />
                            <p className="font-bold">Select class and batch year to view rankings.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rankings.map((r) => (
                        <tr key={`${r.rollNo}-${r.rank}`} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-6 py-4 border-r border-gray-50">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-black ${r.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                              r.rank === 2 ? "bg-gray-100 text-gray-600" :
                                r.rank === 3 ? "bg-orange-100 text-orange-700" :
                                  "bg-gray-50 text-gray-400"
                              }`}>
                              {r.rank}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-900 border-r border-gray-50">{r.rollNo}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900 border-r border-gray-50">{r.name}</td>
                          <td className="px-6 py-4 text-sm text-center border-r border-gray-50">
                            {r.leetcodeLink !== "-" ? (
                              <a href={r.leetcodeLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold transition-colors">
                                View <LayoutGrid size={14} />
                              </a>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-center text-gray-500 border-r border-gray-50">{r.easy}</td>
                          <td className="px-4 py-4 text-sm text-center text-gray-500 border-r border-gray-50">{r.medium}</td>
                          <td className="px-4 py-4 text-sm text-center text-gray-500 border-r border-gray-50">{r.hard}</td>
                          <td className="px-6 py-4 text-sm text-center font-black text-gray-900 bg-gray-50/50">{r.total}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Motion.div>
        </div>
      )}
      {monthlyReportOpen && (
        <MonthlyReportModal
          isOpen={monthlyReportOpen}
          onClose={() => {
            setMonthlyReportOpen(false);
            setIsVerified(false);
          }}
          batchYear={reportBatchYear}
          className={reportClassName}
          batchYears={distinctBatchYears}
          isVerified={isVerified}
          setVerificationOpen={setVerificationOpen}
          setVerificationError={setVerificationError}
        />
      )}
    </div>
  );
}
