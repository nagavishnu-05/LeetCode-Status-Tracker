import { monthlyDB } from "../config/db.js";
import { getMonthlyReportModel } from "../models/MonthlyReport.js";
import fetch from "node-fetch";
import { generateMonthlyExcel } from "./excelService.js";
import { sendMonthlyReportEmail } from "./emailService.js";

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

        for (let i = 0; i < students.length; i += batchSize) {
            const batch = students.slice(i, i + batchSize);
            const ops = [];

            console.log(`   - [${className}] Processing students ${i + 1} to ${Math.min(i + batchSize, students.length)} of ${students.length}...`);

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
                                } else {
                                    // Handle non-ok response by decrementing retries
                                    retries--;
                                    if (retries === 0) {
                                        console.log(`      ⚠️ API Error for ${student.rollNo}: HTTP ${apiRes.status}`);
                                    } else {
                                        await new Promise(resolve => setTimeout(resolve, 1000));
                                    }
                                }
                            } else {
                                break;
                            }
                        } catch (err) {
                            retries--;
                            if (retries > 0) {
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            } else {
                                console.log(`      ⚠️ API Timeout/Error for ${student.rollNo}: ${err.message}`);
                            }
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

            // Incremental save per batch
            if (ops.length > 0) {
                await MonthlyReport.bulkWrite(ops);
            }

            if (i + batchSize < students.length) await new Promise(resolve => setTimeout(resolve, 300));
        }

        return { success: true, count: students.length };
    } catch (err) {
        console.error("Error in generateMonthlyReport:", err);
        throw err;
    }
}

/**
 * Generates an Excel report for a specific class and emails it to the recipient.
 */
export async function generateAndEmailMonthlySummary(batchYear, className, month) {
    try {
        const MonthlyReport = getMonthlyReportModel(Number(batchYear));
        const reports = await MonthlyReport.find({ className, month }).sort({ rollNo: 1 });

        if (reports.length === 0) {
            console.log(`⚠️ [Email] No reports found for Batch ${batchYear} Class ${className} in ${month}. Skipping email.`);
            return;
        }

        console.log(`📊 [Email] Generating Excel for Batch ${batchYear} Class ${className}...`);
        const excelBuffer = await generateMonthlyExcel(reports, className, batchYear, month);

        console.log(`📧 [Email] Sending report to recipient...`);
        await sendMonthlyReportEmail(excelBuffer, className, batchYear, month);

        console.log(`✅ [Email] Successfully processed Batch ${batchYear} Class ${className}`);
    } catch (err) {
        console.error(`❌ [Email] Failed to process Batch ${batchYear} Class ${className}:`, err.message);
    }
}

/**
 * Orchestrates sending monthly reports for all classes at the end of the month.
 * @param {string} dayOverride - Optional day to trigger (usually 2)
 * @param {string} monthOverride - Optional month string (e.g. "March 2026")
 */
export async function sendAllMonthlyReports(dayOverride = null, monthOverride = null) {
    const today = new Date();
    const day = dayOverride || today.getDate();

    // Trigger on Day 2 or if a month is explicitly provided (manual trigger)
    if (day == 2 || monthOverride || dayOverride) {
        console.log(`\n📧 [Email] Starting ${monthOverride ? 'Manual' : 'Automated'} Monthly Report Delivery...`);

        try {
            if (!monthlyDB.db) {
                console.error("❌ [Email] Database connection not ready. Please check your MONGO_URI and network connection.");
                return;
            }
            const collections = await monthlyDB.db.listCollections().toArray();
            const studentCollections = [];

            for (const col of collections) {
                if (/^\d{4}-\d{4}$/.test(col.name)) {
                    studentCollections.push({
                        name: col.name,
                        startYear: parseInt(col.name.split('-')[0])
                    });
                }
            }

            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

            let currentMonth = monthOverride;

            if (!currentMonth) {
                // Default logic: Week 5 triggered on 2nd of month refers to PREVIOUS month
                let reportMonthIndex = today.getMonth() - 1;
                let reportYear = today.getFullYear();
                if (reportMonthIndex < 0) {
                    reportMonthIndex = 11;
                    reportYear = reportYear - 1;
                }
                currentMonth = `${monthNames[reportMonthIndex]} ${reportYear}`;
            }

            console.log(`📅 [Email] Target Month: ${currentMonth}`);

            for (const batchInfo of studentCollections) {
                const batchYear = batchInfo.startYear;
                const { getStudentModel } = await import('../models/Student.js');
                const Student = getStudentModel(batchYear, monthlyDB);
                const distinctClasses = await Student.distinct('className');

                for (const className of distinctClasses) {
                    await generateAndEmailMonthlySummary(batchYear, className, currentMonth);
                }
            }
            console.log(`✅ [Email] All scheduled monthly reports have been processed.\n`);
        } catch (err) {
            console.error("❌ [Email] Error in batch email process:", err);
        }
    } else {
        console.log(`ℹ️ [Email] Day ${day} is not a scheduled email delivery day.`);
    }
}

/**
 * Cleans up the monthly database by deleting all records.
 * This is triggered at the start of a new month cycle (Day 3).
 */
export async function cleanupMonthlyDatabase() {
    console.log(`\n🧹 [Cleanup] Starting Monthly Database Refresh...`);
    try {
        if (!monthlyDB.db) {
            console.error("❌ [Cleanup] Database connection not ready. Cannot perform cleanup.");
            return;
        }
        const collections = await monthlyDB.db.listCollections().toArray();
        let deletedCount = 0;

        for (const col of collections) {
            if (/^\d{4}-\d{4}$/.test(col.name)) {
                const result = await monthlyDB.db.collection(col.name).deleteMany({});
                deletedCount += result.deletedCount;
                console.log(`   - Cleared ${result.deletedCount} records from collection ${col.name}`);
            }
        }
        console.log(`✅ [Cleanup] Database refresh completed. Total records cleared: ${deletedCount}\n`);
    } catch (err) {
        console.error("❌ [Cleanup] Error during database refresh:", err);
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
            if (!monthlyDB.db) {
                console.error("❌ [Service] Database connection not ready. Aborting report process.");
                return;
            }
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

                for (const className of distinctClasses) {
                    try {
                        console.log(`   - Processing Class ${className}...`);
                        await generateMonthlyReport(batchYear, className, currentMonth, weekNumber);
                    } catch (err) {
                        console.error(`❌ [Service] Failed for Batch ${batchYear} Class ${className}:`, err.message);
                    }
                }
            }
        } catch (err) {
            console.error("❌ [Service] Error in report process:", err);
            throw err;
        }
    } else {
        console.log(`ℹ️ [Service] Day ${day} is not a scheduled report day.`);
    }
}
