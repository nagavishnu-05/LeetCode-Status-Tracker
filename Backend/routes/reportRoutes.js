import express from "express";
import axios from "axios";
import { getStudentModel } from "../models/Student.js";

const router = express.Router();

// Fetch all students for a batch/class with updated stats
router.get("/:batchYear/:className", async (req, res) => {
  try {
    const { batchYear, className } = req.params;

    // Validate className
    if (!["A", "B", "C", "D"].includes(className)) {
      return res.status(400).json({ message: "Invalid className" });
    }

    // Get the model for this batch year
    const Student = getStudentModel(Number(batchYear));

    const students = await Student.find({
      className: className,
    }).sort({ rollNo: 1 });

    await Promise.all(
      students.map(async (student) => {
        if (student.leetcodeLink) {
          try {
            const username = student.leetcodeLink
              .split("/")
              .filter(Boolean)
              .pop();

            const { data } = await axios.get(
              `https://leetcode-stats-api.vercel.app/${username}`
            );

            const stats = {
              easy: data.easySolved ?? 0,
              medium: data.mediumSolved ?? 0,
              hard: data.hardSolved ?? 0,
              total: data.totalSolved ?? 0,
            };

            student.statsHistory.push({ date: new Date(), ...stats });
            if (student.statsHistory.length > 2) student.statsHistory.shift();
            await student.save();
          } catch (err) {
            console.error(`Error updating stats for ${student.name}`, err);
          }
        }
      })
    );

    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Generate Monthly Report
router.post("/monthly-report/:batchYear/:className", async (req, res) => {
  try {
    const { batchYear, className } = req.params;
    const { month } = req.body; // Expecting "January 2025" etc.

    if (!month) {
      return res.status(400).json({ message: "Month is required" });
    }

    const Student = getStudentModel(Number(batchYear));
    const MonthlyReport = getMonthlyReportModel(Number(batchYear));

    const students = await Student.find({ className });

    const reportData = [];

    for (const student of students) {
      // Find previous month's report to calculate difference
      // This assumes reports are generated sequentially.
      // For a more robust solution, we could parse the month string, but for now we'll rely on the user/frontend to trigger correctly or just calculate based on current total if no previous report.

      // Actually, to calculate "monthly performance", we need the count from the start of the month.
      // If we have a previous report, we use its 'total' as the baseline.

      const previousReports = await MonthlyReport.find({
        rollNo: student.rollNo,
      }).sort({ reportDate: -1 }).limit(1);

      const previousTotal = previousReports.length > 0 ? previousReports[0].solved.total : 0;

      // Current stats (assuming they are up to date via the other route, or we could fetch fresh here)
      // For speed, we'll use the stored stats in student document. 
      // Ideally, we should trigger an update before generating the report.
      // Let's assume the user clicks "Refresh Data" then "Generate Report".

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
        solved: currentStats, // Store the cumulative total at this point
        performanceCategory,
      });

      await newReport.save();
      reportData.push(newReport);
    }

    res.status(201).json({ message: "Monthly report generated", data: reportData });
  } catch (err) {
    console.error("Error generating monthly report:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get Monthly Reports
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
    console.error("Error fetching monthly reports:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
