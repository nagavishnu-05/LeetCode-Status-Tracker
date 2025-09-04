import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

const API_BASE = "http://localhost:5000";

export default function App() {
  const [staffs, setStaffs] = useState([]);
  const [selected, setSelected] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [studentStats, setStudentStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/staffs`)
      .then((res) => res.json())
      .then((data) => setStaffs(data))
      .catch((err) => console.error("Error fetching staffs:", err));
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
      const res = await fetch(`${API_BASE}/report/${selectedStaff._id}`);
      const students = await res.json();

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
              date: new Date(history[history.length - 2].date).toLocaleDateString(),
            };
            curr = {
              easy: history[history.length - 1].easy,
              medium: history[history.length - 1].medium,
              hard: history[history.length - 1].hard,
              total: history[history.length - 1].total,
              date: new Date(history[history.length - 1].date).toLocaleDateString(),
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

    const headers = [
      "S.No.",
      "Roll No.",
      "Register No.",
      "Name",
      "LeetCode Link",
      `Easy (${studentStats[0]?.prev.date || "-"})`,
      `Medium (${studentStats[0]?.prev.date || "-"})`,
      `Hard (${studentStats[0]?.prev.date || "-"})`,
      `Total (${studentStats[0]?.prev.date || "-"})`,
      `Easy (${studentStats[0]?.curr.date || "-"})`,
      `Medium (${studentStats[0]?.curr.date || "-"})`,
      `Hard (${studentStats[0]?.curr.date || "-"})`,
      `Total (${studentStats[0]?.curr.date || "-"})`,
      "Improvement",
    ];

    const sheetData = [
      headers,
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

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    worksheet["!cols"] = Array(headers.length).fill({ wch: 18 });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "LeetCode Stats");

    const date = new Date().toISOString().split("T")[0];
    const fileName = `${selectedStaff.batchYear}-CSE-${selectedStaff.className}-${date}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col p-6">
      <header className="w-full flex items-center justify-between mb-10">
        <img src="/vcet-logo.jpg" alt="VCET Logo" className="h-16 w-auto object-contain" />
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Velammal College of Engineering and Technology
          </h1>
          <p className="text-lg font-medium text-gray-700">
            Department of Computer Science & Engineering
          </p>
        </div>
        <img src="/cse-logo.jpg" alt="CSE Logo" className="h-16 w-auto object-contain" />
      </header>

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

          <form className="space-y-6 w-full flex flex-col items-center">
            <label className="block w-full">
              <span className="text-base font-semibold text-gray-700">
                Select Class In-Charge
              </span>
              <select
                className="mt-2 w-full rounded-[28px] border border-gray-300 bg-white text-gray-900 focus:border-black focus:ring-black transition px-4 py-4 text-lg shadow-sm hover:shadow-md"
                value={selected}
                onChange={handleSelectChange}
              >
                <option value="">-- Choose --</option>
                {staffs.map((staff) => (
                  <option key={staff._id} value={staff._id}>
                    {staff.name} ({staff.className} - {staff.batchYear})
                  </option>
                ))}
              </select>
            </label>

            {selectedStaff && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <h3 className="font-semibold text-blue-900 mb-2">Selected Staff:</h3>
                <div className="text-sm text-blue-800">
                  <p><strong>Name:</strong> {selectedStaff.name}</p>
                  <p><strong>Class:</strong> {selectedStaff.className}</p>
                  <p><strong>Batch Year:</strong> {selectedStaff.batchYear}</p>
                </div>
              </motion.div>
            )}

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

      {popupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl p-6 relative text-gray-900"
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

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full border-collapse text-sm text-gray-900">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    {[
                      "S.No.",
                      "Roll No.",
                      "Register No.",
                      "Name",
                      "LeetCode Link",
                      `Easy (${studentStats[0]?.prev.date || "-"})`,
                      `Medium (${studentStats[0]?.prev.date || "-"})`,
                      `Hard (${studentStats[0]?.prev.date || "-"})`,
                      `Total (${studentStats[0]?.prev.date || "-"})`,
                      `Easy (${studentStats[0]?.curr.date || "-"})`,
                      `Medium (${studentStats[0]?.curr.date || "-"})`,
                      `Hard (${studentStats[0]?.curr.date || "-"})`,
                      `Total (${studentStats[0]?.curr.date || "-"})`,
                      "Improvement",
                    ].map((h) => (
                      <th key={h} className="border px-2 py-2 text-center font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {studentStats.map((s) => (
                    <tr key={s.rollNo} className="border-b hover:bg-gray-50">
                      <td className="border px-2 py-1 text-center">{s.sNo}</td>
                      <td className="border px-2 py-1 text-center">{s.rollNo}</td>
                      <td className="border px-2 py-1 text-center">{s.registerNo}</td>
                      <td className="border px-2 py-1">{s.name}</td>
                      <td className="border px-2 py-1">
                        {s.leetcodeLink !== "-" ? (
                          <a href={s.leetcodeLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                            Link
                          </a>
                        ) : "-"}
                      </td>
                      <td className="border px-2 py-1 text-center">{s.prev.easy}</td>
                      <td className="border px-2 py-1 text-center">{s.prev.medium}</td>
                      <td className="border px-2 py-1 text-center">{s.prev.hard}</td>
                      <td className="border px-2 py-1 text-center">{s.prev.total}</td>
                      <td className="border px-2 py-1 text-center">{s.curr.easy}</td>
                      <td className="border px-2 py-1 text-center">{s.curr.medium}</td>
                      <td className="border px-2 py-1 text-center">{s.curr.hard}</td>
                      <td className="border px-2 py-1 text-center">{s.curr.total}</td>
                      <td className="border px-2 py-1 text-center">{s.improvement}</td>
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
