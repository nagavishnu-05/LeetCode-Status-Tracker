import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import api from "./api";

export default function App() {
  const [staffs, setStaffs] = useState([]);
  const [selected, setSelected] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [studentStats, setStudentStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showRankings, setShowRankings] = useState(false);
  const [selectedBatchYear, setSelectedBatchYear] = useState("");
  const [selectedClassName, setSelectedClassName] = useState("");
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [staffRes, studentRes] = await Promise.all([
          api.get("/staffs"),
          api.get("/ranking"),
        ]);
        setStaffs(staffRes.data);
        setStudents(studentRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, []);

  const handleSelectChange = (e) => {
    const staffId = e.target.value;
    setSelected(staffId);
    setSelectedStaff(staffs.find((s) => s._id === staffId) || null);
  };

  const fetchStudentStats = async () => {
    if (!selectedStaff) return;
    setLoading(true);
    try {
      const res = await api.get(`/report/${selectedStaff._id}`);
      const studentsData = res.data;

      const stats = studentsData.map((student, index) => {
        const history = student.statsHistory || [];
        let prev = { easy: "-", medium: "-", hard: "-", total: "-", date: "-" };
        let curr = { easy: "-", medium: "-", hard: "-", total: "-", date: "-" };

        if (history.length > 0) {
          const latest = history[history.length - 1];
          curr = {
            easy: latest.easy,
            medium: latest.medium,
            hard: latest.hard,
            total: latest.total,
            date: new Date(latest.date).toLocaleDateString(),
          };
        }
        if (history.length > 1) {
          const prevData = history[history.length - 2];
          prev = {
            easy: prevData.easy,
            medium: prevData.medium,
            hard: prevData.hard,
            total: prevData.total,
            date: new Date(prevData.date).toLocaleDateString(),
          };
        }

        return {
          sNo: index + 1,
          rollNo: student.rollNo,
          registerNo: student.registerNo,
          name: student.name,
          leetcodeLink: student.leetcodeLink || "-",
          prev,
          curr,
          improvement:
            prev.total !== "-" && curr.total !== "-"
              ? curr.total - prev.total
              : "-",
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

  const handleDownload = () => {
    if (!selectedStaff || studentStats.length === 0) return;
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
    const fileName = `${selectedStaff.batchYear}-CSE-${selectedStaff.className}-${date}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const filteredStudents = students
    .filter((student) => {
      const matchBatch =
        !selectedBatchYear || student.batchYear === selectedBatchYear;
      const matchClass =
        !selectedClassName || student.className === selectedClassName;
      return matchBatch && matchClass;
    })
    .sort((a, b) => b.totalSolved - a.totalSolved);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col p-6">
      {/* Header */}
      <header className="w-full flex items-center justify-between mb-10">
        <img
          src="/vcet-logo.jpg"
          alt="VCET Logo"
          className="h-16 w-auto object-contain"
        />
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Velammal College of Engineering and Technology
          </h1>
          <p className="text-lg font-medium text-gray-700">
            Department of Computer Science & Engineering
          </p>
        </div>
        <img
          src="/cse-logo.jpg"
          alt="CSE Logo"
          className="h-16 w-auto object-contain"
        />
      </header>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl shadow-2xl p-8 sm:p-10 flex flex-col items-center justify-center"
        >
          <h2 className="text-4xl font-extrabold mb-8 text-center text-gray-900 tracking-tight">
            LeetCode Stats Report
          </h2>

          {/* Staff Dropdown */}
          <form className="space-y-6 w-full flex flex-col items-center">
            <label className="block w-full">
              <span className="text-base font-semibold text-gray-700">
                Select Class In-Charge
              </span>
              <div className="relative mt-2 w-full">
                <div 
                  onClick={() => setIsOpen(!isOpen)}
                  className="w-full rounded-[28px] border-2 border-gray-300 bg-white text-gray-900 hover:border-gray-400 transition-all px-6 py-4 text-lg shadow-md hover:shadow-lg cursor-pointer relative"
                >
                  <span className={selected ? "" : "text-gray-500"}>
                    {selected ? staffs.find(s => s._id === selected)?.name + 
                              ` (${staffs.find(s => s._id === selected)?.className} - ${staffs.find(s => s._id === selected)?.batchYear})` 
                            : "-- Choose --"}
                  </span>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg 
                      className={`h-6 w-6 text-gray-600 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                
                {isOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 py-2 max-h-60 overflow-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
                    <div 
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-gray-500"
                      onClick={() => {
                        handleSelectChange({ target: { value: "" } });
                        setIsOpen(false);
                      }}
                    >
                      -- Choose --
                    </div>
                    {[...staffs]
                      .sort((a, b) => a.batchYear - b.batchYear)
                      .map((staff) => (
                      <div
                        key={staff._id}
                        className={`px-4 py-3 cursor-pointer transition-colors ${
                          selected === staff._id 
                            ? 'bg-black text-white' 
                            : 'text-gray-900 hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          handleSelectChange({ target: { value: staff._id } });
                          setIsOpen(false);
                        }}
                      >
                        <span className="font-medium">{staff.name}</span>
                        <span className="text-sm ml-1">({staff.className} - {staff.batchYear})</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4">
                  <svg
                    className="h-6 w-6 text-black"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M6 9L12 15L18 9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </label>

            {selectedStaff && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <h3 className="font-semibold text-blue-900 mb-2">
                  Selected Staff:
                </h3>
                <div className="text-sm text-blue-800">
                  <p>
                    <strong>Name:</strong> {selectedStaff.name}
                  </p>
                  <p>
                    <strong>Class:</strong> {selectedStaff.className}
                  </p>
                  <p>
                    <strong>Batch Year:</strong> {selectedStaff.batchYear}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Buttons */}
            <div className="flex flex-col gap-3 w-full sm:w-1/2 mx-auto">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                disabled={!selected || loading}
                onClick={fetchStudentStats}
                className="w-full flex items-center justify-center gap-2 rounded-[28px] bg-black text-white py-4 font-semibold hover:bg-gray-900 shadow-md disabled:opacity-50 transition-all duration-300"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path>
                    </svg>
                    <span>Generating...</span>
                  </div>
                ) : (
                  <span>Next</span>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => setShowRankings(true)}
                className="w-full flex items-center justify-center gap-2 rounded-[28px] bg-blue-600 text-white py-4 font-semibold hover:bg-blue-700 shadow-md transition-all duration-300"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path d="M4 13H10V19H4V13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 5H20V11H14V5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 5H10V11H4V5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 13H20V19H14V13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                View Rankings
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Stats Popup */}
      {popupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-6xl bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 relative text-gray-900"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Students</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full hover:bg-gray-900"
                >
                  <Download className="h-5 w-5" /> Download Excel
                </button>
                <button
                  onClick={() => setPopupOpen(false)}
                  className="text-gray-500 hover:text-gray-900 font-bold text-xl px-2 py-1"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[500px] ring-1 ring-gray-200 rounded-lg">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th
                      rowSpan="2"
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50/80"
                    >
                      S.No.
                    </th>
                    <th
                      rowSpan="2"
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50/80"
                    >
                      Roll No.
                    </th>
                    <th
                      rowSpan="2"
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50/80"
                    >
                      Register No.
                    </th>
                    <th
                      rowSpan="2"
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50/80"
                    >
                      Name
                    </th>
                    <th
                      rowSpan="2"
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50/80"
                    >
                      LeetCode
                    </th>
                    <th
                      colSpan="4"
                      className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50/80 border-b border-gray-200"
                    >
                      Previous Report ({studentStats[0]?.prev.date || "-"})
                    </th>
                    <th
                      colSpan="4"
                      className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50/80 border-b border-gray-200"
                    >
                      Current Report ({studentStats[0]?.curr.date || "-"})
                    </th>
                    <th
                      rowSpan="2"
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50/80"
                    >
                      Improvement
                    </th>
                  </tr>
                  <tr className="bg-gray-50/80">
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Easy
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Medium
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Hard
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Easy
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Medium
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Hard
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {studentStats.map((s, idx) => (
                    <tr 
                      key={s.rollNo} 
                      className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0"
                    >
                      <td className="px-6 py-3.5 text-sm text-gray-900">{s.sNo}</td>
                      <td className="px-6 py-3.5 text-sm text-gray-900">
                        {s.rollNo}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-gray-600">
                        {s.registerNo}
                      </td>
                      <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{s.name}</td>
                      <td className="px-6 py-3.5 text-sm text-center">
                        {s.leetcodeLink !== "-" ? (
                          <a
                            href={s.leetcodeLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            Link
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-center text-gray-600">
                        {s.prev.easy}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-center text-gray-600">
                        {s.prev.medium}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-center text-gray-600">
                        {s.prev.hard}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-center font-medium text-gray-900">
                        {s.prev.total}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-center text-gray-600">
                        {s.curr.easy}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-center text-gray-600">
                        {s.curr.medium}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-center text-gray-600">
                        {s.curr.hard}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-center font-medium text-gray-900">
                        {s.curr.total}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-center font-medium text-gray-900">
                        {s.improvement}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

      {/* Rankings Popup */}
      {showRankings && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" onClick={() => setShowRankings(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-6xl bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 relative text-gray-900 mx-auto">
          
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">LeetCode Rankings</h2>
              <button
                onClick={() => setShowRankings(false)}
                className="text-gray-500 hover:text-gray-900 font-bold text-xl px-2 py-1"
              >
                ×
              </button>
            </div>

            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Year</label>
                <select
                  className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-2 focus:border-black focus:ring-black transition-all"
                  value={selectedBatchYear}
                  onChange={(e) => {
                    setSelectedBatchYear(e.target.value);
                    setSelectedClassName("");
                  }}
                >
                  <option value="">All Batch Years</option>
                  {[...new Set(staffs.map(staff => staff.batchYear))].sort().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                <select
                  className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-2 focus:border-black focus:ring-black transition-all"
                  value={selectedClassName}
                  onChange={(e) => setSelectedClassName(e.target.value)}
                  disabled={!selectedBatchYear}
                >
                  <option value="">All Classes</option>
                  {selectedBatchYear && 
                    (parseInt(selectedBatchYear) >= 2025 ? 
                      ['A', 'B', 'C', 'D'] : 
                      ['A', 'B', 'C']
                    ).map(section => (
                      <option key={section} value={`CSE-${section}`}>
                        {section}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px] ring-1 ring-gray-200 rounded-lg">
              <table className="min-w-full">
                <thead className="bg-gray-50/80 sticky top-0">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Roll No.</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Problems Solved</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Easy</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Medium</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Hard</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents
                    .sort((a, b) => b.totalSolved - a.totalSolved)
                    .map((student, index) => (
                      <tr 
                        key={student._id} 
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{index + 1}</td>
                        <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-6 py-3.5 text-sm text-gray-600">{student.className}</td>
                        <td className="px-6 py-3.5 text-sm text-gray-600">{student.rollNo}</td>
                        <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{student.totalSolved}</td>
                        <td className="px-6 py-3.5 text-sm text-gray-600">{student.easySolved}</td>
                        <td className="px-6 py-3.5 text-sm text-gray-600">{student.mediumSolved}</td>
                        <td className="px-6 py-3.5 text-sm text-gray-600">{student.hardSolved}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
