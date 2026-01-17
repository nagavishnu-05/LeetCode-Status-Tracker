import express from "express";
import { getStudentModel } from "../models/Student.js";
import { getMonthlyReportModel } from "../models/MonthlyReport.js";

const router = express.Router();

// [LEGACY] Generate Monthly Report
router.post("/monthly-report/:batchYear/:className", async (req, res) => {
    try {
        const { batchYear, className } = req.params;
        const { month } = req.body;

        if (!month) {
            return res.status(400).json({ message: "Month is required" });
        }

        const Student = getStudentModel(Number(batchYear));
        const MonthlyReport = getMonthlyReportModel(Number(batchYear));

        const students = await Student.find({ className });
        const reportData = [];

        for (const student of students) {
            const previousReports = await MonthlyReport.find({
                rollNo: student.rollNo,
            }).sort({ reportDate: -1 }).limit(1);

            const previousTotal = previousReports.length > 0 ? previousReports[0].solved.total : 0;
            const currentStats = student.statsHistory.length > 0
                ? student.statsHistory[student.statsHistory.length - 1]
                : { easy: 0, medium: 0, hard: 0, total: 0 };

            const monthlySolved = currentStats.total - previousTotal;

            let performanceCategory = "Average";
            if (monthlySolved >= 20) performanceCategory = "Consistent";
            else if (monthlySolved < 10) performanceCategory = "Low";

            const newReport = new MonthlyReport({
                rollNo: student.rollNo,
                registerNo: student.registerNo,
                name: student.name,
                className: student.className,
                batchYear: Number(batchYear),
                month: month,
                solved: currentStats,
                performanceCategory,
            });

            await newReport.save();
            reportData.push(newReport);
        }

        res.status(201).json({ message: "Legacy monthly report generated", data: reportData });
    } catch (err) {
        console.error("Error generating legacy monthly report:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// [LEGACY] Get Monthly Reports
router.get("/monthly-report/:batchYear/:className", async (req, res) => {
    try {
        const { batchYear, className } = req.params;
        const { month } = req.query;

        const MonthlyReport = getMonthlyReportModel(Number(batchYear));

        const query = { className };
        if (month) query.month = month;

        const reports = await MonthlyReport.find(query).sort({ rollNo: 1 });
        res.json(reports);
    } catch (err) {
        console.error("Error fetching legacy monthly reports:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;
