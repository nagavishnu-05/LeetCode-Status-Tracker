import express from "express";
import fetch from "node-fetch";
import { getMonthlyReportModel } from "../models/MonthlyReport.js";
import { getStudentModel } from "../models/Student.js";

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
        const Student = getStudentModel(Number(batchYear));
        const students = await Student.find({ className });
        // console.log(`Found ${students.length} students in Monthly DB collection for Batch ${batchYear} Class ${className}`);

        if (students.length === 0) {
            console.log(`No students found in Monthly DB for Batch ${batchYear} Class ${className}.`);
            return [];
        }
        const reportData = [];

        // console.log(`Starting report generation for Batch ${batchYear} Class ${className} - Week ${weekNumber}`);

        const batchSize = 30; // Increased concurrency
        const ops = [];

        for (let i = 0; i < students.length; i += batchSize) {
            const batch = students.slice(i, i + batchSize);
            await Promise.all(batch.map(async (student) => {
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
                                await new Promise(resolve => setTimeout(resolve, 500));
                            }
                        }
                    }
                }

                if (Number(weekNumber) === 1) {
                    // Optimized: Only fetch what's needed
                    const lastMonthReport = await MonthlyReport.findOne({
                        rollNo: student.rollNo,
                        month: { $ne: month }
                    }).sort({ reportDate: -1 }).select('weeklyPerformance');

                    let baselineTotal = 0;
                    if (lastMonthReport && lastMonthReport.weeklyPerformance.length > 0) {
                        baselineTotal = lastMonthReport.weeklyPerformance[lastMonthReport.weeklyPerformance.length - 1].solved.total;
                    }

                    /* 
                    ops.push({
                        deleteOne: {
                            filter: { rollNo: student.rollNo, month: { $ne: month } }
                        }
                    });
                    */

                    ops.push({
                        insertOne: {
                            document: {
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
                                    performanceCategory: "Average"
                                }]
                            }
                        }
                    });
                } else {
                    const existingReport = await MonthlyReport.findOne({
                        rollNo: student.rollNo,
                        month: month
                    });

                    let updateData;
                    if (!existingReport) {
                        updateData = {
                            $setOnInsert: {
                                rollNo: student.rollNo,
                                registerNo: student.registerNo,
                                name: student.name,
                                leetcodeLink: student.leetcodeLink,
                                className: student.className,
                                batchYear: Number(batchYear),
                                startTotal: currentStats.total
                            },
                            $push: {
                                weeklyPerformance: {
                                    weekNumber: Number(weekNumber),
                                    date: new Date(),
                                    solved: currentStats,
                                    performanceCategory: "Average"
                                }
                            }
                        };
                    } else {
                        const existingWeekIndex = existingReport.weeklyPerformance.findIndex(w => w.weekNumber === Number(weekNumber));
                        if (existingWeekIndex !== -1) {
                            // Update existing week
                            const updateKey = `weeklyPerformance.${existingWeekIndex}`;
                            updateData = {
                                $set: {
                                    [updateKey]: {
                                        weekNumber: Number(weekNumber),
                                        date: new Date(),
                                        solved: currentStats,
                                        performanceCategory: "Average"
                                    }
                                }
                            };
                        } else {
                            // Push new week
                            updateData = {
                                $push: {
                                    weeklyPerformance: {
                                        weekNumber: Number(weekNumber),
                                        date: new Date(),
                                        solved: currentStats,
                                        performanceCategory: "Average"
                                    }
                                }
                            };
                        }

                        if (Number(weekNumber) === 5) {
                            const totalMonthlySolved = currentStats.total - existingReport.startTotal;
                            let overallStatus = "Average";
                            if (totalMonthlySolved >= 17) overallStatus = "Consistent";
                            else if (totalMonthlySolved <= 10) overallStatus = "Low";
                            updateData.$set = { ...updateData.$set, overallStatus };
                        }
                    }

                    ops.push({
                        updateOne: {
                            filter: { rollNo: student.rollNo, month: month },
                            update: updateData,
                            upsert: true
                        }
                    });
                }
            }));
            // Small gap between batches to avoid overwhelming the external API
            if (i + batchSize < students.length) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        if (ops.length > 0) {
            await MonthlyReport.bulkWrite(ops);
        }
        return { success: true, count: students.length };
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

        const query = { className };
        if (month) {
            query.month = month;
        }

        let reports;
        if (month) {
            reports = await MonthlyReport.find(query).sort({ rollNo: 1 });
        } else {
            // Find the most recent month that has any reports for this class
            const latestDoc = await MonthlyReport.findOne({ className }).sort({ reportDate: -1 });
            if (latestDoc) {
                const latestMonth = latestDoc.month;
                reports = await MonthlyReport.find({ className, month: latestMonth }).sort({ rollNo: 1 });
            } else {
                reports = [];
            }
        }

        // Fetch all unique students that have EVER been in this class's monthly reports
        const allStudentsInCollection = await MonthlyReport.find({ className });
        const uniqueStudentsMap = new Map();

        // 1. Populate map with all known students from history
        // Use the most recent basic info for each student
        const sortedAll = [...allStudentsInCollection].sort((a, b) => new Date(b.reportDate) - new Date(a.reportDate));

        sortedAll.forEach(s => {
            if (!uniqueStudentsMap.has(s.rollNo)) {
                uniqueStudentsMap.set(s.rollNo, {
                    rollNo: s.rollNo,
                    registerNo: s.registerNo,
                    name: s.name,
                    leetcodeLink: s.leetcodeLink,
                    className: s.className,
                    batchYear: s.batchYear,
                    month: s.month, // Default to their last known month
                    startTotal: 0,
                    weeklyPerformance: [],
                    overallStatus: null,
                    isPlaceholder: true // Default to placeholder
                });
            }
        });

        // 2. Overwrite with actual report data for this query if it exists
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
