import express from "express";
import Student from "../models/Student.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { batchYear, className } = req.query;
    const filter = {};

    // Only filter if it's not "All"
    if (batchYear && batchYear !== "All") filter.batchYear = Number(batchYear);
    if (className && className !== "All") filter.className = className;

    const students = await Student.find(filter);

    // Always return latest stats sorted by totalSolved desc
    const result = students
      .map((student) => {
        const latest = student.statsHistory?.[student.statsHistory.length - 1] || {};
        return {
          _id: student._id,
          name: student.name,
          rollNo: student.rollNo,
          className: student.className,
          batchYear: student.batchYear,
          easySolved: latest.easy || 0,
          mediumSolved: latest.medium || 0,
          hardSolved: latest.hard || 0,
          totalSolved: latest.total || 0,
        };
      })
      .sort((a, b) => b.totalSolved - a.totalSolved);

    res.json(result);
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
