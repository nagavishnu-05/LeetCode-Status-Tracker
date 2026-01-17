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

    const batchSize = 10;
    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize);
      await Promise.all(batch.map(async (student) => {
        if (student.leetcodeLink) {
          let retries = 3;
          while (retries > 0) {
            try {
              const username = student.leetcodeLink
                .split("/")
                .filter(Boolean)
                .pop();

              const { data } = await axios.get(
                `https://leetcode-stats-api.vercel.app/${username}`,
                { timeout: 5000 }
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
              break; // Success, exit retry loop
            } catch (err) {
              retries--;
              if (retries === 0) {
                console.error(`Error updating stats for ${student.name} after 3 attempts:`, err.message);
              } else {
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry
              }
            }
          }
        }
      }));
      // Optional small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }


    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


export default router;
