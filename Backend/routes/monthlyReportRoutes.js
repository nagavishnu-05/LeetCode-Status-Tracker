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

        // Fetch all existing students from this collection who belong to this class
        // Even if they don't have a report for the CURRENT month yet, they exist in the collection.
        const allStudentsInCollection = await MonthlyReport.find({ className });

        // Get unique students by rollNo
        const uniqueStudentsMap = new Map();
        allStudentsInCollection.forEach(s => {
            if (!uniqueStudentsMap.has(s.rollNo)) {
                uniqueStudentsMap.set(s.rollNo, {
                    rollNo: s.rollNo,
                    registerNo: s.registerNo,
                    name: s.name,
                    leetcodeLink: s.leetcodeLink,
                    className: s.className,
                    batchYear: s.batchYear,
                    startTotal: s.startTotal || 0
                });
            }
        });

        const students = Array.from(uniqueStudentsMap.values());
        console.log(`Found ${students.length} students in Monthly DB collection for Batch ${batchYear} Class ${className}`);

        if (students.length === 0) {
            console.log(`No students found in Monthly DB for Batch ${batchYear} Class ${className}.`);
            return [];
        }
        const reportData = [];

        console.log(`Starting report generation for Batch ${batchYear} Class ${className} - Week ${weekNumber}`);

        for (const student of students) {
            // 1. Fetch Live Data from LeetCode API
            let currentStats = { easy: 0, medium: 0, hard: 0, total: 0 };
            let fetchSuccess = false;

            if (student.leetcodeLink) {
                let retries = 3;
                while (retries > 0) {
                    try {
                        const username = extractUsername(student.leetcodeLink);
                        if (username) {
                            const apiRes = await fetch(`https://leetcode-stats-api.vercel.app/${username}`, {
                                signal: AbortSignal.timeout(5000)
                            });
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
                                }
                                break; // Success
                            } else {
                                throw new Error(`API responded with status ${apiRes.status}`);
                            }
                        } else {
                            break; // No username
                        }
                    } catch (err) {
                        retries--;
                        if (retries === 0) {
                            console.error(`Failed to fetch stats for ${student.name} after 3 attempts:`, err.message);
                        } else {
                            console.warn(`Retry ${3 - retries} for ${student.name} due to: ${err.message}`);
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    }
                }
                // Add a small delay between students
                await new Promise(resolve => setTimeout(resolve, 100));
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

        // Fetch all unique students that have EVER been in this class's monthly reports
        const allStudentsInCollection = await MonthlyReport.find({ className });
        const uniqueStudentsMap = new Map();

        // 1. Populate map with all known students from history
        allStudentsInCollection.forEach(s => {
            if (!uniqueStudentsMap.has(s.rollNo)) {
                uniqueStudentsMap.set(s.rollNo, {
                    rollNo: s.rollNo,
                    registerNo: s.registerNo,
                    name: s.name,
                    leetcodeLink: s.leetcodeLink,
                    className: s.className,
                    batchYear: s.batchYear,
                    month: month,
                    startTotal: 0,
                    weeklyPerformance: [],
                    overallStatus: null,
                    isPlaceholder: true // Default to placeholder
                });
            }
        });

        // 2. Overwrite with actual report data for this month if it exists
        reports.forEach(r => {
            uniqueStudentsMap.set(r.rollNo, r); // This removes the isPlaceholder flag since 'r' is a real doc
        });

        // 3. Convert map back to array and sort
        const finalReports = Array.from(uniqueStudentsMap.values()).sort((a, b) => {
            // Safe sort in case rollNo is missing or not a string (though it should be)
            const rollA = String(a.rollNo || "");
            const rollB = String(b.rollNo || "");
            return rollA.localeCompare(rollB, undefined, { numeric: true });
        });

        res.json(finalReports);
    } catch (err) {
        console.error("Error fetching reports:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;
