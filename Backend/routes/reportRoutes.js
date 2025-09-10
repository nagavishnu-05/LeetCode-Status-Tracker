import express from "express";
import axios from "axios";
import Staff from "../models/Staff.js";
import Student from "../models/Student.js";

const router = express.Router();

// Fetch all students for a staff with updated stats
router.get("/:staffId", async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.staffId);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    const students = await Student.find({
      className: staff.className,
      batchYear: staff.batchYear,
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

export default router;
