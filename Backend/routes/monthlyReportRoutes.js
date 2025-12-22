import express from "express";
import fetch from "node-fetch";
import { getMonthlyReportModel } from "../models/MonthlyReport.js";

const router = express.Router();

// Helper to extract username
function extractUsername(input) {
    if (!input) return "";
    if (input.includes("leetcode.com")) {
        input = input.endsWith("/") ? input.slice(0, -1) : input;
        return input.split("/").pop();
    }
    return input;
}

// Standalone function for report generation (can be called by cron or API)
export async function generateMonthlyReport(batchYear, className, month, weekNumber) {
    try {
        const MonthlyReport = getMonthlyReportModel(Number(batchYear));

        // Fetch all existing reports for this class to get the student list
        const allExistingReports = await MonthlyReport.find({ className });

        // Get unique students by rollNo
        const uniqueStudentsMap = new Map();
        allExistingReports.forEach(r => {
            if (!uniqueStudentsMap.has(r.rollNo)) {
                uniqueStudentsMap.set(r.rollNo, {
                    rollNo: r.rollNo,
                    registerNo: r.registerNo,
                    name: r.name,
                    leetcodeLink: r.leetcodeLink,
                    className: r.className,
                    batchYear: r.batchYear,
                    startTotal: r.startTotal // Keep track of startTotal if we need to carry it over
                });
            }
        });

        const students = Array.from(uniqueStudentsMap.values());

        if (students.length === 0) {
            console.log(`No students found in Monthly DB for Batch ${batchYear} Class ${className}. Skipping report generation.`);
            return [];
        }
        const reportData = [];

        console.log(`Starting report generation for Batch ${batchYear} Class ${className} - Week ${weekNumber}`);

        for (const student of students) {
            // 1. Fetch Live Data from LeetCode API
            let currentStats = { easy: 0, medium: 0, hard: 0, total: 0 };
            let fetchSuccess = false;

            if (student.leetcodeLink) {
                try {
                    const username = extractUsername(student.leetcodeLink);
                    if (username) {
                        const apiRes = await fetch(`https://leetcode-stats-api.vercel.app/${username}`);
                        if (apiRes.ok) {
                            const data = await apiRes.json();
                            if (data.status === "success" || data.totalSolved !== undefined) {
                                currentStats = {
                                    easy: data.easySolved || 0,
                                    medium: data.mediumSolved || 0,
                                    hard: data.hardSolved || 0,
                                    total: data.totalSolved || 0,
                                    date: new Date()
                                };
                                fetchSuccess = true;

                                student.statsHistory.push(currentStats);
                                if (student.statsHistory.length > 2) student.statsHistory.shift();
                                await student.save();
                            }
                        }
                    }
                } catch (err) {
                    console.error(`Failed to fetch stats for ${student.name}:`, err.message);
                    // Fallback removed as per user request (no interaction with Main DB statsHistory)
                }
            }

            // 2. Handle Deletion and Baseline for Week 1
            if (Number(weekNumber) === 1) {
                // Find previous month's report to get baseline total
                const lastMonthReport = await MonthlyReport.findOne({
                    rollNo: student.rollNo,
                    month: { $ne: month }
                }).sort({ reportDate: -1 });

                let baselineTotal = 0;
                if (lastMonthReport && lastMonthReport.weeklyPerformance.length > 0) {
                    baselineTotal = lastMonthReport.weeklyPerformance[lastMonthReport.weeklyPerformance.length - 1].solved.total;
                }

                // Delete old reports for this student (all months except current)
                await MonthlyReport.deleteMany({
                    rollNo: student.rollNo,
                    month: { $ne: month }
                });

                // Calculate Week 1 performance (not needed for display anymore, but keeping structure)
                const solvedSinceLastCheck = currentStats.total - baselineTotal;

                const newReport = new MonthlyReport({
                    rollNo: student.rollNo,
                    registerNo: student.registerNo,
                    name: student.name,
                    leetcodeLink: student.leetcodeLink,
                    className: student.className,
                    batchYear: Number(batchYear),
                    month: month,
                    startTotal: baselineTotal,
                    weeklyPerformance: [{
                        weekNumber: 1,
                        date: new Date(),
                        solved: currentStats,
                        performanceCategory: "Average" // Placeholder
                    }]
                });

                await newReport.save();
                reportData.push(newReport);
            } else {
                // 3. Handle Weeks 2-5
                let reportDoc = await MonthlyReport.findOne({
                    rollNo: student.rollNo,
                    month: month
                });

                if (!reportDoc) {
                    reportDoc = new MonthlyReport({
                        rollNo: student.rollNo,
                        registerNo: student.registerNo,
                        name: student.name,
                        leetcodeLink: student.leetcodeLink,
                        className: student.className,
                        batchYear: Number(batchYear),
                        month: month,
                        startTotal: currentStats.total, // Fallback if Week 1 was missed
                        weeklyPerformance: []
                    });
                }

                const existingWeekIndex = reportDoc.weeklyPerformance.findIndex(w => w.weekNumber === Number(weekNumber));

                const newWeekData = {
                    weekNumber: Number(weekNumber),
                    date: new Date(),
                    solved: currentStats,
                    performanceCategory: "Average" // Placeholder
                };

                if (existingWeekIndex !== -1) {
                    reportDoc.weeklyPerformance[existingWeekIndex] = newWeekData;
                } else {
                    reportDoc.weeklyPerformance.push(newWeekData);
                }

                // 4. Calculate Overall Status on Week 5
                if (Number(weekNumber) === 5) {
                    const totalMonthlySolved = currentStats.total - reportDoc.startTotal;

                    let overallStatus = "Average";
                    if (totalMonthlySolved >= 17) overallStatus = "Consistent";
                    else if (totalMonthlySolved <= 10) overallStatus = "Low";
                    else overallStatus = "Average";

                    reportDoc.overallStatus = overallStatus;
                }

                await reportDoc.save();
                reportData.push(reportDoc);
            }
        }
        return reportData;
    } catch (err) {
        console.error("Error in generateMonthlyReport:", err);
        throw err;
    }
}

// Generate Weekly Snapshot for Monthly Report
// This should be called weekly (e.g., via cron or manual trigger)
router.post("/generate/:batchYear/:className", async (req, res) => {
    try {
        const { batchYear, className } = req.params;
        const { month, weekNumber } = req.body; // e.g., "January 2025", weekNumber: 1

        if (!month || !weekNumber) {
            return res.status(400).json({ message: "Month and Week Number are required" });
        }

        const reportData = await generateMonthlyReport(batchYear, className, month, weekNumber);
        res.status(201).json({ message: "Weekly snapshot generated with live data", data: reportData });
    } catch (err) {
        console.error("Error generating weekly snapshot:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Get Reports
router.get("/:batchYear/:className", async (req, res) => {
    try {
        const { batchYear, className } = req.params;
        let { month } = req.query;

        const MonthlyReport = getMonthlyReportModel(Number(batchYear));

        // Default to current month if not provided
        if (!month) {
            const date = new Date();
            month = date.toLocaleString('default', { month: 'long' }) + " " + date.getFullYear();
        }

        const query = { className, month };

        let reports = await MonthlyReport.find(query).sort({ rollNo: 1 });

        // If no reports found for this month, try to get student list from ANY month in Monthly DB
        if (reports.length === 0) {
            const allReports = await MonthlyReport.find({ className }).sort({ rollNo: 1 });

            if (allReports.length > 0) {
                // Get unique students by rollNo
                const uniqueStudents = [];
                const seenRollNos = new Set();

                for (const r of allReports) {
                    if (!seenRollNos.has(r.rollNo)) {
                        seenRollNos.add(r.rollNo);
                        uniqueStudents.push({
                            rollNo: r.rollNo,
                            registerNo: r.registerNo,
                            name: r.name,
                            leetcodeLink: r.leetcodeLink,
                            className: r.className,
                            batchYear: r.batchYear,
                            month: month,
                            startTotal: 0,
                            weeklyPerformance: [],
                            overallStatus: null,
                            isPlaceholder: true
                        });
                    }
                }
                reports = uniqueStudents;
            } else {
                // No reports at all in Monthly DB for this class
                reports = [];
            }
        }

        res.json(reports);
    } catch (err) {
        console.error("Error fetching reports:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;
