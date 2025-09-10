import express from "express";
import axios from "axios";
import Student from "../models/Student.js";

const router = express.Router();

// 🔥 Fetch students dynamically by className & batchYear only
router.get("/", async (req, res) => {
  try {
    const { className, batchYear } = req.query;

    // Build dynamic query
    const query = {};
    if (className && className !== "all") query.className = className;
    if (batchYear && batchYear !== "all") query.batchYear = batchYear;

    const students = await Student.find(query).sort({ rollNo: 1 });

    // Update stats
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

export default router;
