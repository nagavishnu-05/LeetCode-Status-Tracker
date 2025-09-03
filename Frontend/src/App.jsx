import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

const API_BASE = "http://localhost:5000";

export default function App() {
  const [staffs, setStaffs] = useState([]);
  const [selected, setSelected] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Fetch staff list
  useEffect(() => {
    fetch(`${API_BASE}/staffs`)
      .then((res) => res.json())
      .then((data) => setStaffs(data))
      .catch((err) => console.error("Error Fetching Staffs", err));
  }, []);

  const handleSelectChange = (e) => {
    const selectedId = e.target.value;
    setSelected(selectedId);
    const staff = staffs.find((s) => s._id === selectedId);
    setSelectedStaff(staff || null);
  };

  const extractUsername = (link) => {
    if (!link) return "";
    return link.replace(/\/+$/, "").split("/").pop();
  };

  // Fetch stats for students
  const fetchStudentStats = async (students) => {
    const promises = students.map(async (student, index) => {
      const username = extractUsername(student.leetcodeLink);

      if (!username) {
        return {
          sNo: index + 1,
          rollNo: student.rollNo,
          registerNo: student.registerNo,
          name: student.name,
          leetcodeLink: "-",
          easy: "-",
          medium: "-",
          hard: "-",
          total: "-",
        };
      }

      try {
        const res = await fetch(`${API_BASE}/api/leetcode/${username}`);
        const data = await res.json();
        return {
          sNo: index + 1,
          rollNo: student.rollNo,
          registerNo: student.registerNo,
          name: student.name,
          leetcodeLink: student.leetcodeLink,
          easy: data.easySolved ?? "-",
          medium: data.mediumSolved ?? "-",
          hard: data.hardSolved ?? "-",
          total: data.totalSolved ?? "-",
        };
      } catch (error) {
        console.error(`Error fetching stats for ${student.name}`, error);
        return {
          sNo: index + 1,
          rollNo: student.rollNo,
          registerNo: student.registerNo,
          name: student.name,
          leetcodeLink: student.leetcodeLink,
          easy: "-",
          medium: "-",
          hard: "-",
          total: "-",
        };
      }
    });

    return Promise.all(promises);
  };

  // Handle download
  const handleDownload = async () => {
    if (!selectedStaff) return;
    setDownloading(true);

    try {
      const studentsRes = await fetch(
        `${API_BASE}/students/${selectedStaff.className}/${selectedStaff.batchYear}`
      );
      const students = await studentsRes.json();
      const studentStats = await fetchStudentStats(students);

      console.table(studentStats); // Verification table in console

      // Prepare headers
      const headers = [
        { key: "sNo", header: "S.No." },
        { key: "rollNo", header: "Roll No." },
        { key: "registerNo", header: "Register No." },
        { key: "name", header: "Name" },
        { key: "leetcodeLink", header: "LeetCode Link" },
        { key: "easy", header: "Easy" },
        { key: "medium", header: "Medium" },
        { key: "hard", header: "Hard" },
        { key: "total", header: "Total" },
      ];

      const sheetData = [
        headers.map((h) => h.header),
        ...studentStats.map((student) => [
          student.sNo,
          student.rollNo,
          student.registerNo,
          student.name,
          student.leetcodeLink,
          student.easy,
          student.medium,
          student.hard,
          student.total,
        ]),
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

      // Set column widths
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 12 },
        { wch: 15 },
        { wch: 25 },
        { wch: 30 },
        { wch: 8 },
        { wch: 8 },
        { wch: 8 },
        { wch: 8 },
      ];

      // Style cells
      const range = XLSX.utils.decode_range(worksheet["!ref"]);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cellRef]) continue;

          if (R === 0) {
            worksheet[cellRef].s = {
              font: { bold: true },
              alignment: { horizontal: "center", vertical: "center" },
            };
          } else {
            if ([0, 1, 2, 5, 6, 7, 8].includes(C)) {
              worksheet[cellRef].s = {
                alignment: { horizontal: "center", vertical: "center" },
              };
            } else {
              worksheet[cellRef].s = {
                alignment: { horizontal: "left", vertical: "center" },
              };
            }
          }
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "LeetCode Stats");
      const fileName = `${selectedStaff.batchYear}-CSE-${selectedStaff.className}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error("Error generating report:", err);
      alert("Failed to generate Excel report.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col p-6">
      {/* HEADER */}
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

      {/* CARD */}
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-xl bg-gradient-to-br from-white to-gray-50 
                     border border-gray-200 rounded-2xl shadow-2xl 
                     p-8 sm:p-10 flex flex-col items-center justify-center"
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
                className="mt-2 w-full rounded-[28px] border border-gray-300 bg-white text-gray-900 
                           focus:border-black focus:ring-black transition 
                           px-4 py-4 text-lg shadow-sm hover:shadow-md"
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

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              disabled={!selected || downloading}
              onClick={handleDownload}
              className="w-full sm:w-1/2 mx-auto flex items-center justify-center gap-2 
                rounded-[28px] bg-black text-white py-4 font-semibold 
                hover:bg-gray-900 shadow-md 
                disabled:opacity-50 transition-all duration-300"
            >
              {downloading ? (
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
                <>
                  <Download className="h-5 w-5" />
                  <span>Download Excel</span>
                </>
              )}
            </motion.button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Note: LeetCode statistics are fetched live and compiled into an
            Excel report.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
