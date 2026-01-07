import React, { useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import api from "../api";
import * as XLSX from "xlsx";
import { Calendar, Users, Download, X, ShieldCheck } from "lucide-react";

export default function MonthlyReportModal({
    isOpen,
    onClose,
    batchYear: initialBatchYear,
    className: initialClassName,
    batchYears = [],
    isVerified,
    setVerificationOpen,
    setVerificationError,
}) {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState("");

    // Internal state for selection
    const [selectedBatch, setSelectedBatch] = useState(initialBatchYear || "");
    const [selectedClass, setSelectedClass] = useState(initialClassName || "");
    const [classOptions, setClassOptions] = useState([]);

    // Update class options when batch changes
    useEffect(() => {
        let classes = [];
        if (selectedBatch === "") {
            classes = [];
        } else if (parseInt(selectedBatch) >= 2025) {
            classes = ['A', 'B', 'C', 'D'];
        } else {
            classes = ['A', 'B', 'C'];
        }
        setClassOptions(classes);
        // Reset class if not in options (unless it's empty)
        if (selectedClass && !classes.includes(selectedClass)) {
            setSelectedClass("");
        }
    }, [selectedBatch]);

    // Fetch reports when selection changes
    useEffect(() => {
        if (isOpen) {
            if (!isVerified) {
                setVerificationOpen(true);
                return;
            }
            if (selectedBatch && selectedClass) {
                fetchReports();
            }
        } else {
            setReports([]); // Clear reports if selection is invalid
        }
    }, [isOpen, selectedBatch, selectedClass, isVerified]);

    const getRomanYear = (batchYear) => {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth(); // 0-11
        const joinYear = parseInt(batchYear);
        if (isNaN(joinYear)) return "";

        // Calculate academic year
        // If we are in Jan-May (months 0-4), we are in the second semester of the academic year
        // So simple subtraction gives the year (e.g., Jan 2026 - 2025 join = 1st year)
        // If we happen to be in June-Dec (months 5-11), we have started the NEXT academic year
        // (e.g., June 2026 - 2025 join = 1 year diff, but actually starting 2nd year)

        let studyYear = currentYear - joinYear;

        // If we are in the second half of the calendar year (June onwards), 
        // we move to the next academic year.
        if (currentMonth >= 5) {
            studyYear += 1;
        }

        // Just in case currentMonth is Jan-May, the simple diff is correct for "current" academic year?
        // Let's trace:
        // Jan 2026, Batch 2025. Diff=1. Month=0. Result = 1 (I). Correct.
        // Jan 2026, Batch 2022. Diff=4. Month=0. Result = 4 (IV). Correct.

        const numerals = ["", "I", "II", "III", "IV"];
        // Ensure within bounds 1-4
        return numerals[Math.min(Math.max(studyYear, 1), 4)];
    };

    const formatDate = (date) => {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/monthly-report/${selectedBatch}/${selectedClass}`);
            const data = res.data;
            setReports(data);

            if (data.length > 0) {
                setSelectedMonth(data[0].month);
            }
        } catch (err) {
            console.error("Error fetching monthly reports:", err);
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!isVerified) {
            setVerificationOpen(true);
            return;
        }
        if (currentMonthReports.length === 0) return;

        const exportData = currentMonthReports.map((report) => {
            const row = {
                "Roll No": report.rollNo,
                "Name": report.name,
            };

            [1, 2, 3, 4, 5].forEach((week) => {
                const weekData = report.weeklyPerformance.find((w) => w.weekNumber === week);
                row[`Week ${week}`] = weekData ? weekData.solved.total : "-";
            });

            row["Status"] = report.overallStatus || "Pending";
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Report");

        const romanYear = getRomanYear(selectedBatch);
        const formattedDate = formatDate(new Date());
        const fileName = `${romanYear} CSE ${selectedClass} LeetCode Monthly Report - ${formattedDate}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    if (!isOpen) return null;

    // Sort reports for the selected month (no need to filter as backend already does it)
    const currentMonthReports = [...reports].sort((a, b) => {
        const priority = { "Low": 1, "Average": 2, "Consistent": 3 };
        const aStatus = a.overallStatus || "Pending";
        const bStatus = b.overallStatus || "Pending";

        // If both have priority, sort by priority
        if (priority[aStatus] && priority[bStatus]) {
            return priority[aStatus] - priority[bStatus];
        }
        // Put "Pending" at the end
        if (!priority[aStatus]) return 1;
        if (!priority[bStatus]) return -1;
        return 0;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
            <Motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                            Monthly Performance Report
                            {isVerified && selectedMonth && (
                                <span className="text-blue-600 ml-2">— {selectedMonth}</span>
                            )}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1 font-medium">
                            Track and analyze student LeetCode progress
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar">
                    {!isVerified ? (
                        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                            <div className="bg-white w-16 h-16 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck size={32} className="text-blue-500" />
                            </div>
                            <p className="text-gray-500 font-bold text-lg">Verification Required</p>
                            <p className="text-gray-400 text-sm mt-1">Please verify your staff credentials to access monthly reports</p>
                            <button
                                onClick={() => setVerificationOpen(true)}
                                className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95"
                            >
                                Verify Now
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Selection Controls */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="relative group">
                                    <label className="flex items-center text-sm font-bold text-gray-700 mb-2 ml-1">
                                        <Calendar size={16} className="mr-2 text-blue-500" />
                                        Batch Year
                                    </label>
                                    <select
                                        className="w-full appearance-none rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                                        value={selectedBatch}
                                        onChange={(e) => setSelectedBatch(e.target.value)}
                                    >
                                        <option value="">Select Batch</option>
                                        {batchYears.map((yr) => (
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
                                        value={selectedClass}
                                        onChange={(e) => setSelectedClass(e.target.value)}
                                        disabled={!selectedBatch}
                                    >
                                        <option value="">Select Class</option>
                                        {classOptions.map((cls) => (
                                            <option key={cls} value={cls}>{cls}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 bottom-3.5 pointer-events-none text-gray-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="flex items-end">
                                    <button
                                        onClick={handleExport}
                                        disabled={currentMonthReports.length === 0}
                                        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-bold py-3 px-6 rounded-2xl transition-all shadow-md shadow-green-600/10 active:scale-95"
                                    >
                                        <Download size={18} />
                                        Export to Excel
                                    </button>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p className="text-gray-500 font-bold">Fetching latest reports...</p>
                                </div>
                            ) : !selectedBatch || !selectedClass ? (
                                <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                    <div className="bg-white w-16 h-16 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                                        <Users size={32} className="text-gray-300" />
                                    </div>
                                    <p className="text-gray-500 font-bold text-lg">Select Batch and Class to begin</p>
                                    <p className="text-gray-400 text-sm mt-1">Choose options above to view performance data</p>
                                </div>
                            ) : currentMonthReports.length === 0 ? (
                                <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                    <p className="text-gray-500 font-bold text-lg">No reports found for this selection</p>
                                    <p className="text-gray-400 text-sm mt-1">Reports are generated automatically every week</p>
                                </div>
                            ) : (
                                <div className="overflow-hidden ring-1 ring-gray-200 rounded-3xl shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">
                                                        Roll No
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">
                                                        Student Name
                                                    </th>
                                                    {[
                                                        { label: "Week 1", day: "4th" },
                                                        { label: "Week 2", day: "11th" },
                                                        { label: "Week 3", day: "18th" },
                                                        { label: "Week 4", day: "25th" },
                                                        { label: "Week 5", day: "2nd" },
                                                    ].map((wk) => (
                                                        <th
                                                            key={wk.label}
                                                            className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-widest"
                                                        >
                                                            <div className="flex flex-col items-center">
                                                                <span>{wk.label}</span>
                                                                <span className="text-[10px] text-gray-400 font-medium">({wk.day})</span>
                                                            </div>
                                                        </th>
                                                    ))}
                                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-100/50">
                                                        Status
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-100">
                                                {currentMonthReports.map((studentReport) => (
                                                    <tr
                                                        key={studentReport.rollNo}
                                                        className="hover:bg-blue-50/30 transition-colors group"
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                                            {studentReport.rollNo}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 uppercase">
                                                            {studentReport.name}
                                                        </td>
                                                        {[1, 2, 3, 4, 5].map((week) => {
                                                            const weekData = studentReport.weeklyPerformance.find(
                                                                (w) => w.weekNumber === week
                                                            );
                                                            return (
                                                                <td key={week} className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-600">
                                                                    {weekData ? weekData.solved.total : "-"}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-6 py-4 whitespace-nowrap text-center bg-gray-50/30 group-hover:bg-blue-50/50 transition-colors">
                                                            {studentReport.overallStatus ? (
                                                                <span
                                                                    className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm ${studentReport.overallStatus === "Consistent"
                                                                        ? "bg-green-600 text-white"
                                                                        : studentReport.overallStatus === "Low"
                                                                            ? "bg-red-600 text-white"
                                                                            : "bg-yellow-500 text-white"
                                                                        }`}
                                                                >
                                                                    {studentReport.overallStatus}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-300 text-[10px] font-bold uppercase tracking-widest italic">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </Motion.div>
        </div>
    );
}
