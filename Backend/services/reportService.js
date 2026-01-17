import { monthlyDB } from "../config/db.js";
import { getMonthlyReportModel } from "../models/MonthlyReport.js";
import fetch from "node-fetch";

// Helper to extract username
function extractUsername(input) {
    if (!input) return "";
    if (input.includes("leetcode.com")) {
        input = input.endsWith("/") ? input.slice(0, -1) : input;
        return input.split("/").pop();
    }
    return input;
}

/**
 * Core function for generating/updating monthly report records for a specific class.
 */
export async function generateMonthlyReport(batchYear, className, month, weekNumber) {
    try {
        const MonthlyReport = getMonthlyReportModel(Number(batchYear));

        // 1. Try to find students in Monthly DB
        let students = await MonthlyReport.find({ className, month: { $exists: false } });

        // 2. Fallback: Find students from any month in history
        if (students.length === 0) {
            const allDocs = await MonthlyReport.find({ className }).sort({ reportDate: -1 });
            const uniqueMap = new Map();
            allDocs.forEach(d => {
                if (!uniqueMap.has(d.rollNo)) uniqueMap.set(d.rollNo, d);
            });
            students = Array.from(uniqueMap.values());
        }

        // 3. Ultimate Fallback: Fetch from the MAIN database if still empty
        if (students.length === 0) {
            const { getStudentModel } = await import('../models/Student.js');
            const MainStudent = getStudentModel(Number(batchYear));
            students = await MainStudent.find({ className });

            if (students.length > 0) {
                console.log(`ℹ️ [Sync] Synced ${students.length} students from Main DB for Batch ${batchYear} Class ${className}`);
            }
        }

        if (students.length === 0) {
            console.log(`⚠️ No students found for Batch ${batchYear} Class ${className} in either DB.`);
            return [];
        }

        const reportData = [];
        const batchSize = 30;
        const ops = [];

        for (let i = 0; i < students.length; i += batchSize) {
            const batch = students.slice(i, i + batchSize);
            await Promise.all(batch.map(async (student) => {
                let currentStats = { easy: 0, medium: 0, hard: 0, total: 0 };

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
                                    }
                                    break;
                                }
                            } else {
                                break;
                            }
                        } catch (err) {
                            retries--;
                            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    }
                }

                if (Number(weekNumber) === 1) {
                    const lastMonthReport = await MonthlyReport.findOne({
                        rollNo: student.rollNo,
                        month: { $ne: month }
                    }).sort({ reportDate: -1 }).select('weeklyPerformance');

                    let baselineTotal = 0;
                    if (lastMonthReport && lastMonthReport.weeklyPerformance.length > 0) {
                        baselineTotal = lastMonthReport.weeklyPerformance[lastMonthReport.weeklyPerformance.length - 1].solved.total;
                    }

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
                    const existingReport = await MonthlyReport.findOne({ rollNo: student.rollNo, month: month });
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
            if (i + batchSize < students.length) await new Promise(resolve => setTimeout(resolve, 300));
        }

        if (ops.length > 0) await MonthlyReport.bulkWrite(ops);
        return { success: true, count: students.length };
    } catch (err) {
        console.error("Error in generateMonthlyReport:", err);
        throw err;
    }
}

/**
 * Orchestrates the monthly report generation process across all batches and classes.
 */
export async function runReportProcess(dayOverride = null, weekNumberOverride = null) {
    const today = new Date();
    const day = dayOverride || today.getDate();

    let weekNumber = weekNumberOverride;
    if (!weekNumber) {
        if (day == 4) weekNumber = 1;
        else if (day == 11) weekNumber = 2;
        else if (day == 18) weekNumber = 3;
        else if (day == 25) weekNumber = 4;
        else if (day == 2) weekNumber = 5;
    }

    if (weekNumber > 0) {
        console.log(`\n📅 [Service] Triggering Weekly Report (Week ${weekNumber})`);

        try {
            const collections = await monthlyDB.db.listCollections().toArray();
            const studentCollections = [];

            for (const col of collections) {
                if (/^\d{4}-\d{4}$/.test(col.name)) {
                    const count = await monthlyDB.db.collection(col.name).countDocuments();
                    if (count > 0) {
                        studentCollections.push({
                            name: col.name,
                            startYear: parseInt(col.name.split('-')[0])
                        });
                    }
                }
            }

            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            let reportMonthIndex = today.getMonth();
            let reportYear = today.getFullYear();

            if (weekNumber === 5) {
                reportMonthIndex = reportMonthIndex - 1;
                if (reportMonthIndex < 0) { reportMonthIndex = 11; reportYear = reportYear - 1; }
            }

            const currentMonth = `${monthNames[reportMonthIndex]} ${reportYear}`;

            for (const batchInfo of studentCollections) {
                const batchYear = batchInfo.startYear;
                const { getStudentModel } = await import('../models/Student.js');
                const Student = getStudentModel(batchYear, monthlyDB);
                let distinctClasses = await Student.distinct('className');

                if (batchYear < 2025) {
                    distinctClasses = distinctClasses.filter(c => c !== 'D');
                }

                console.log(`📊 [Service] Processing Batch ${batchYear} Class(es): ${distinctClasses.join(', ')}`);

                await Promise.all(distinctClasses.map(async (className) => {
                    try {
                        await generateMonthlyReport(batchYear, className, currentMonth, weekNumber);
                    } catch (err) {
                        console.error(`❌ [Service] Failed for Batch ${batchYear} Class ${className}:`, err.message);
                    }
                }));
            }
        } catch (err) {
            console.error("❌ [Service] Error in report process:", err);
            throw err;
        }
    } else {
        console.log(`ℹ️ [Service] Day ${day} is not a scheduled report day.`);
    }
}
