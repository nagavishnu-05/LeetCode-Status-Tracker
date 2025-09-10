import express from "express";
import Student from "../models/Student.js";

const router = express.Router();

// Get all students with latest stats computed
router.get("/", async (req, res) => {
  try {
    const students = await Student.find({});
    const studentsWithStats = students.map((student) => {
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
    });
    res.json(studentsWithStats);
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
