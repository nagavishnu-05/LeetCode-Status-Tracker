import { useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import api from "./api";
import './select.css';

export default function App() {
  const [studentStats, setStudentStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [roundsOpen, setRoundsOpen] = useState(false);
  const [selectedClassName, setSelectedClassName] = useState("");
  const [selectedBatchYear, setSelectedBatchYear] = useState("");
  const [reportBatchYear, setReportBatchYear] = useState("");
  const [reportClassName, setReportClassName] = useState("");
  const [rankings, setRankings] = useState([]);
  const [loadingRankings, setLoadingRankings] = useState(false);
  const [distinctBatchYears, setDistinctBatchYears] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [reportClassOptions, setReportClassOptions] = useState([]);


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
        const res = await api.get("/staffs/distinct");
        setDistinctBatchYears(res.data?.batchYears || []);
      } catch (err) {
        console.error("Error fetching distinct staff values:", err);
      }
    };
    fetchDistinct();
  }, []);



  // Fetch student stats
  const fetchStudentStats = async () => {
    if (!reportBatchYear || !reportClassName) {
      alert("Please select both batch year and section");
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
      alert("Failed to fetch student stats");
    } finally {
      setLoading(false);
    }
  };

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
      <div className="flex-1 flex items-center justify-center">
        <Motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className="w-full max-w-xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl shadow-2xl p-8 sm:p-10 flex flex-col items-center justify-center" >
          <h2 className="text-4xl font-extrabold mb-8 text-center text-gray-900 tracking-tight"> LeetCode Stats Report </h2>
          <form className="space-y-6 w-full flex flex-col items-center">
            <label className="block w-full">
              <span className="text-base font-semibold text-gray-700">Select Batch Year</span>
              <div className="relative mt-2 w-full">
                <select
                  className="w-full appearance-none rounded-lg border border-gray-200 bg-white text-gray-800 pl-6 pr-12 py-4 text-sm font-medium hover:border-gray-300 focus:border-gray-300 focus:ring-0 transition-all shadow-sm hover:shadow-md cursor-pointer"
                  value={reportBatchYear}
                  onChange={(e) => setReportBatchYear(e.target.value)}
                  style={{
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    backgroundColor: '#fff',
                    backgroundImage: 'linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%)',
                  }}
                >
                  <option value="">-- Choose Batch Year --</option>
                  {[...distinctBatchYears]
                    .filter(Boolean)
                    .sort((a, b) => a - b)
                    .map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-6">
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </label>

            <label className="block w-full">
              <span className="text-base font-semibold text-gray-700">Select Section</span>
              <div className="relative mt-2 w-full">
                <select
                  className="w-full appearance-none rounded-lg border border-gray-200 bg-white text-gray-800 pl-6 pr-12 py-4 text-sm font-medium hover:border-gray-300 focus:border-gray-300 focus:ring-0 transition-all shadow-sm hover:shadow-md cursor-pointer"
                  value={reportClassName}
                  onChange={(e) => setReportClassName(e.target.value)}
                  disabled={!reportBatchYear}
                  style={{
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    backgroundColor: '#fff',
                    backgroundImage: 'linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%)',
                  }}
                >
                  <option value="">-- Choose Section --</option>
                  {reportClassOptions.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-6">
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </label>

            <Motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              disabled={!reportBatchYear || !reportClassName || loading}
              onClick={fetchStudentStats}
              className="w-full sm:w-1/2 mx-auto flex items-center justify-center gap-2 rounded-[28px] bg-black text-white py-4 font-semibold hover:bg-gray-900 shadow-md disabled:opacity-50 transition-all duration-300"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <span>Generating...</span>
                </div>
              ) : (
                <span>Generate Report</span>
              )}
            </Motion.button>

            <Motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => setRoundsOpen(true)}
              className="w-full sm:w-1/2 mx-auto mt-3 flex items-center justify-center gap-2 rounded-[28px] bg-blue-600 text-white py-4 font-semibold hover:bg-blue-700 shadow-md transition-all duration-300"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="3" y="3" width="8" height="8" rx="2" ry="2"></rect>
                <rect x="13" y="3" width="8" height="8" rx="2" ry="2"></rect>
                <rect x="3" y="13" width="8" height="8" rx="2" ry="2"></rect>
                <rect x="13" y="13" width="8" height="8" rx="2" ry="2"></rect>
              </svg>
              <span>View Rankings</span>
            </Motion.button>
          </form>
        </Motion.div>
      </div>

      {popupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <Motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }} className="w-full max-w-6xl bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 relative text-gray-900" >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Students</h2>
              <div className="flex items-center gap-2">
                <button onClick={handleDownload} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full hover:bg-gray-900" >
                  <Download className="h-5 w-5" /> Download Excel
                </button>
                <button onClick={() => setPopupOpen(false)} className="text-gray-500 hover:text-gray-900 font-bold text-xl px-2 py-1" > × </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[500px] ring-1 ring-gray-200 rounded-lg">
              <table className="min-w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th rowSpan="2" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50/80">S.No.</th>
                    <th rowSpan="2" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50/80">Roll No.</th>
                    <th rowSpan="2" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50/80">Register No.</th>
                    <th rowSpan="2" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50/80">Name</th>
                    <th rowSpan="2" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50/80">LeetCode</th>
                    <th colSpan="4" className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50/80 border-b border-gray-200">Previous Report ({studentStats[0]?.prev.date || "-"})</th>
                    <th colSpan="4" className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50/80 border-b border-gray-200">Current Report ({studentStats[0]?.curr.date || "-"})</th>
                    <th rowSpan="2" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50/80">Improvement</th>
                  </tr>
                  <tr className="bg-gray-50/80">
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Easy</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Medium</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Hard</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Easy</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Medium</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Hard</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {studentStats.map((s) => (
                    <tr key={s.rollNo} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0">
                      <td className="px-6 py-3.5 text-sm text-gray-900">{s.sNo}</td>
                      <td className="px-6 py-3.5 text-sm text-gray-900">{s.rollNo}</td>
                      <td className="px-6 py-3.5 text-sm text-gray-600">{s.registerNo}</td>
                      <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{s.name}</td>
                      <td className="px-6 py-3.5 text-sm text-center">
                        {s.leetcodeLink !== "-" ? (
                          <a href={s.leetcodeLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                            Link
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-center text-gray-600">{s.prev.easy}</td>
                      <td className="px-6 py-3.5 text-sm text-center text-gray-600">{s.prev.medium}</td>
                      <td className="px-6 py-3.5 text-sm text-center text-gray-600">{s.prev.hard}</td>
                      <td className="px-6 py-3.5 text-sm text-center font-medium text-gray-900">{s.prev.total}</td>
                      <td className="px-6 py-3.5 text-sm text-center text-gray-600">{s.curr.easy}</td>
                      <td className="px-6 py-3.5 text-sm text-center text-gray-600">{s.curr.medium}</td>
                      <td className="px-6 py-3.5 text-sm text-center text-gray-600">{s.curr.hard}</td>
                      <td className="px-6 py-3.5 text-sm text-center font-medium text-gray-900">{s.curr.total}</td>
                      <td className="px-6 py-3.5 text-sm text-center font-medium text-gray-900">{s.improvement}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>
          </Motion.div>
        </div>)}
      {roundsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <Motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }} className="w-full max-w-6xl bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 relative text-gray-900" >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">View Rankings</h2>
              <button onClick={() => setRoundsOpen(false)} className="text-gray-500 hover:text-gray-900 font-bold text-xl px-2 py-1">×</button>
            </div>
            <div className="mt-3 border-t border-gray-200" />
            <div className="mt-6">
              <div className="flex gap-4">
                <label className="block w-1/2">
                  <span className="text-sm font-semibold text-gray-700">Select Batch Year</span>
                  <div className="relative mt-2 w-full">
                    <select
                      className="w-full appearance-none rounded-lg border border-gray-200 bg-white text-gray-800 pl-6 pr-12 py-3 text-sm font-medium hover:border-gray-300 focus:border-gray-300 focus:ring-0 transition-all shadow-sm hover:shadow-md cursor-pointer"
                      value={selectedBatchYear}
                      onChange={(e) => setSelectedBatchYear(e.target.value)}
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none', backgroundColor: '#fff' }}
                    >
                      <option value="">-- Choose Batch Year --</option>
                      <option value="all">All Batches</option>
                      {[...distinctBatchYears]
                        .filter(Boolean)
                        .sort((a, b) => a - b)
                        .map((yr) => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-6">
                      <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </label>
                <label className="block w-1/2">
                  <span className="text-sm font-semibold text-gray-700">Select Class</span>
                  <div className="relative mt-2 w-full">
                    <select
                      className="w-full appearance-none rounded-lg border border-gray-200 bg-white text-gray-800 pl-6 pr-12 py-3 text-sm font-medium hover:border-gray-300 focus:border-gray-300 focus:ring-0 transition-all shadow-sm hover:shadow-md cursor-pointer"
                      value={selectedClassName}
                      onChange={(e) => setSelectedClassName(e.target.value)}
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none', backgroundColor: '#fff' }}
                    >
                      <option value="">-- Choose Class --</option>
                      {classOptions.map((cls) => (
                        <option key={cls} value={cls === 'All Classes' ? 'all' : cls}>{cls}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-6">
                      <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </label>
              </div>
              <div className="mt-6">
                <div className="overflow-x-auto max-h-[500px] ring-1 ring-gray-200 rounded-lg">
                  <table className="min-w-full">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Roll No.</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">LeetCode</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Easy</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Medium</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Hard</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingRankings ? (
                        <tr><td className="px-6 py-4 text-sm text-gray-600" colSpan="8">Loading...</td></tr>
                      ) : rankings.length === 0 ? (
                        <tr><td className="px-6 py-4 text-sm text-gray-600" colSpan="8">Select class and batch year to view rankings.</td></tr>
                      ) : (
                        rankings.map((r) => (
                          <tr key={`${r.rollNo}-${r.rank}`} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0">
                            <td className="px-6 py-3.5 text-sm text-gray-900">{r.rank}</td>
                            <td className="px-6 py-3.5 text-sm text-gray-900">{r.rollNo}</td>
                            <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{r.name}</td>
                            <td className="px-6 py-3.5 text-sm text-center">
                              {r.leetcodeLink !== "-" ? (
                                <a href={r.leetcodeLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                                  Link
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-6 py-3.5 text-sm text-center text-gray-600">{r.easy}</td>
                            <td className="px-6 py-3.5 text-sm text-center text-gray-600">{r.medium}</td>
                            <td className="px-6 py-3.5 text-sm text-center text-gray-600">{r.hard}</td>
                            <td className="px-6 py-3.5 text-sm text-center font-medium text-gray-900">{r.total}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Motion.div>
        </div>
      )}
    </div>
  );
}
