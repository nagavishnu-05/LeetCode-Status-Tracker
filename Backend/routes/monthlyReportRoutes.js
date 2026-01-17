import express from "express";
import { getMonthlyReportModel } from "../models/MonthlyReport.js";
import { generateMonthlyReport } from "../services/reportService.js";

const router = express.Router();

// Get unique batchYears that actually have collections in Monthly DB
router.get("/distinct-batches", async (req, res) => {
    try {
        const { monthlyDB } = await import('../config/db.js');
        if (monthlyDB.readyState !== 1) {
            await monthlyDB.asPromise();
        }
        const collections = await monthlyDB.db.listCollections().toArray();
        const validBatches = [];

        for (const col of collections) {
            if (/^\d{4}-\d{4}$/.test(col.name)) {
                const count = await monthlyDB.db.collection(col.name).countDocuments();
                if (count > 0) {
                    validBatches.push(parseInt(col.name.split('-')[0]));
                }
            }
        }
        res.json({ batchYears: validBatches.sort((a, b) => a - b) });
    } catch (err) {
        console.error("❌ Error fetching distinct monthly batches:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Generate Weekly Snapshot for Monthly Report
router.post("/generate/:batchYear/:className", async (req, res) => {
    try {
        const { batchYear, className } = req.params;
        const { month, weekNumber } = req.body;

        console.log(`📥 Snapshot Request: Batch=${batchYear}, Class=${className}, Month=${month}, Week=${weekNumber}`);
        console.log(`📦 Body:`, req.body);

        if (!month || !weekNumber) {
            return res.status(400).json({ message: "Month and Week Number are required", received: { month, weekNumber } });
        }

        const reportData = await generateMonthlyReport(batchYear, className, month, weekNumber);
        res.status(201).json({ message: "Weekly snapshot generated successfully!", data: reportData });
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

        if (!month) {
            const date = new Date();
            month = date.toLocaleString('default', { month: 'long' }) + " " + date.getFullYear();
        }

        const reports = await MonthlyReport.find({ className, month }).sort({ rollNo: 1 });

        // Fetch all unique students to ensure a complete list (with placeholders if needed)
        const allDocs = await MonthlyReport.find({ className });
        const uniqueStudentsMap = new Map();

        allDocs.forEach(s => {
            if (!uniqueStudentsMap.has(s.rollNo)) {
                uniqueStudentsMap.set(s.rollNo, {
                    rollNo: s.rollNo,
                    registerNo: s.registerNo,
                    name: s.name,
                    leetcodeLink: s.leetcodeLink,
                    className: s.className,
                    batchYear: s.batchYear,
                    isPlaceholder: true
                });
            }
        });

        reports.forEach(r => uniqueStudentsMap.set(r.rollNo, r));

        const finalReports = Array.from(uniqueStudentsMap.values()).sort((a, b) =>
            String(a.rollNo).localeCompare(String(b.rollNo), undefined, { numeric: true })
        );

        res.json(finalReports);
    } catch (err) {
        console.error("Error fetching reports:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;
