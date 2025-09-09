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

  useEffect(() => {
    const fetchStaffs = async () => {
      try {
        const res = await api.get("/staffs");
        setStaffs(res.data);
      } catch (err) {
        console.error("Error fetching staffs:", err);
      }
    };

    fetchStaffs();
  }, []);

  const handleSelectChange = (e) => {
    const staffId = e.target.value;
    setSelected(staffId);
    const staff = staffs.find((s) => s._id === staffId);
    setSelectedStaff(staff || null);
  };

  const fetchStudentStats = async () => {
    if (!selectedStaff) return;
    setLoading(true);

    try {
      const res = await api.get(`/report/${selectedStaff._id}`);
      const students = res.data;

      const stats = students.map((student, index) => {
        let prev = { easy: "-", medium: "-", hard: "-", total: "-", date: "-" };
        let curr = { easy: "-", medium: "-", hard: "-", total: "-", date: "-" };

        if (student.statsHistory.length > 0) {
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

    // Add 5 empty rows
    for (let i = 0; i < 5; i++) {
      sheetData.push([]);
    }

    // Add signature rows
    const signatureRowIndex = sheetData.length;
    sheetData.push([
      "",
      "Placement Coordinator Signature", // under Roll No.
      "",
      "",
      "Head of the Department Signature", // under LeetCode Link
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Merge cells for headers
    worksheet["!merges"] = [
      { s: { r: 0, c: 5 }, e: { r: 0, c: 8 } }, // Previous Report
      { s: { r: 0, c: 9 }, e: { r: 0, c: 12 } }, // Current Report
      { s: { r: signatureRowIndex, c: 1 }, e: { r: signatureRowIndex, c: 3 } }, // Placement Coordinator
      { s: { r: signatureRowIndex, c: 4 }, e: { r: signatureRowIndex, c: 6 } }, // HOD
    ];

    worksheet["!cols"] = Array(header2.length).fill({ wch: 18 });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "LeetCode Stats");

    const date = new Date().toISOString().split("T")[0];
    const fileName = `${selectedStaff.batchYear}-CSE-${selectedStaff.className}-${date}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

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
                  className="appearance-none w-full rounded-[28px] border-2 border-gray-300 bg-white text-gray-900 focus:border-black focus:ring-black transition-all px-6 py-4 text-lg shadow-md hover:shadow-lg pr-12 cursor-pointer flex justify-between items-center"
                >
                  <span className={selected ? "" : "text-gray-500"}>
                    {selected ? staffs.find(s => s._id === selected)?.name + 
                              ` (${staffs.find(s => s._id === selected)?.className} - ${staffs.find(s => s._id === selected)?.batchYear})` 
                            : "-- Choose --"}
                  </span>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4">
                    <svg className={`h-6 w-6 text-black transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24">
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

            {/* Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              disabled={!selected || loading}
              onClick={fetchStudentStats}
              className="w-full sm:w-1/2 mx-auto flex items-center justify-center gap-2 rounded-[28px] bg-black text-white py-4 font-semibold hover:bg-gray-900 shadow-md disabled:opacity-50 transition-all duration-300"
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
          </form>
        </motion.div>
      </div>

      {/* Popup */}
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
                  <Download className="h-5 w-5" />
                  Download Excel
                </button>
                <button
                  onClick={() => setPopupOpen(false)}
                  className="text-gray-500 hover:text-gray-900 font-bold text-xl px-2 py-1"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px] rounded-xl">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th
                      rowSpan="2"
                      className="bg-gray-100 px-4 py-3 text-center font-semibold border-b-2 border-gray-200 first:rounded-tl-xl"
                    >
                      S.No.
                    </th>
                    <th
                      rowSpan="2"
                      className="bg-gray-100 px-4 py-3 text-center font-semibold border-b-2 border-gray-200"
                    >
                      Roll No.
                    </th>
                    <th
                      rowSpan="2"
                      className="bg-gray-100 px-4 py-3 text-center font-semibold border-b-2 border-gray-200"
                    >
                      Register No.
                    </th>
                    <th
                      rowSpan="2"
                      className="bg-gray-100 px-4 py-3 text-center font-semibold border-b-2 border-gray-200"
                    >
                      Name
                    </th>
                    <th
                      rowSpan="2"
                      className="bg-gray-100 px-4 py-3 text-center font-semibold border-b-2 border-gray-200"
                    >
                      LeetCode Link
                    </th>
                    <th
                      colSpan="4"
                      className="bg-gray-100 px-4 py-3 text-center font-semibold border-b-2 border-gray-200"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span>Previous Report</span>
                        <span className="text-sm text-gray-500">({studentStats[0]?.prev.date || "-"})</span>
                      </div>
                    </th>
                    <th
                      colSpan="4"
                      className="bg-gray-100 px-4 py-3 text-center font-semibold border-b-2 border-gray-200"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span>Current Report</span>
                        <span className="text-sm text-gray-500">({studentStats[0]?.curr.date || "-"})</span>
                      </div>
                    </th>
                    <th
                      rowSpan="2"
                      className="bg-gray-100 px-4 py-3 text-center font-semibold border-b-2 border-gray-200 last:rounded-tr-xl"
                    >
                      Improvement
                    </th>
                  </tr>
                  <tr>
                    <th className="bg-gray-100 px-4 py-3 text-center font-medium text-sm border-b-2 border-gray-200">
                      Easy
                    </th>
                    <th className="bg-gray-100 px-4 py-3 text-center font-medium text-sm border-b-2 border-gray-200">
                      Medium
                    </th>
                    <th className="bg-gray-100 px-4 py-3 text-center font-medium text-sm border-b-2 border-gray-200">
                      Hard
                    </th>
                    <th className="bg-gray-100 px-4 py-3 text-center font-medium text-sm border-b-2 border-gray-200">
                      Total
                    </th>
                    <th className="bg-gray-100 px-4 py-3 text-center font-medium text-sm border-b-2 border-gray-200">
                      Easy
                    </th>
                    <th className="bg-gray-100 px-4 py-3 text-center font-medium text-sm border-b-2 border-gray-200">
                      Medium
                    </th>
                    <th className="bg-gray-100 px-4 py-3 text-center font-medium text-sm border-b-2 border-gray-200">
                      Hard
                    </th>
                    <th className="bg-gray-100 px-4 py-3 text-center font-medium text-sm border-b-2 border-gray-200">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {studentStats.map((s, index) => (
                    <tr 
                      key={s.rollNo} 
                      className={`
                        transition-colors hover:bg-gray-50
                        ${index === studentStats.length - 1 ? 'last-row' : ''}
                      `}
                    >
                      <td className="border-b border-gray-200 px-4 py-3 text-center">{s.sNo}</td>
                      <td className="border-b border-gray-200 px-4 py-3 text-center font-medium">
                        {s.rollNo}
                      </td>
                      <td className="border-b border-gray-200 px-4 py-3 text-center text-gray-600">
                        {s.registerNo}
                      </td>
                      <td className="border-b border-gray-200 px-4 py-3 font-medium">{s.name}</td>
                      <td className="border-b border-gray-200 px-4 py-3 text-center">
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
                      <td className="border-b border-gray-200 px-4 py-3 text-center">
                        {s.prev.easy}
                      </td>
                      <td className="border-b border-gray-200 px-4 py-3 text-center">
                        {s.prev.medium}
                      </td>
                      <td className="border-b border-gray-200 px-4 py-3 text-center">
                        {s.prev.hard}
                      </td>
                      <td className="border-b border-gray-200 px-4 py-3 text-center font-medium">
                        {s.prev.total}
                      </td>
                      <td className="border-b border-gray-200 px-4 py-3 text-center">
                        {s.curr.easy}
                      </td>
                      <td className="border-b border-gray-200 px-4 py-3 text-center">
                        {s.curr.medium}
                      </td>
                      <td className="border-b border-gray-200 px-4 py-3 text-center">
                        {s.curr.hard}
                      </td>
                      <td className="border-b border-gray-200 px-4 py-3 text-center font-medium">
                        {s.curr.total}
                      </td>
                      <td className="border-b border-gray-200 px-4 py-3 text-center font-medium">
                        {typeof s.improvement === 'number' ? (
                          <span className={`${s.improvement > 0 ? 'text-green-600' : s.improvement < 0 ? 'text-red-600' : ''}`}>
                            {s.improvement > 0 ? '+' : ''}{s.improvement}
                          </span>
                        ) : s.improvement}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
