import express from "express";
import { getStudentModel } from "../models/Student.js";

const router = express.Router();

// Fetch students stats based on filters
router.get("/", async (req, res) => {
  try {
    const { batchYear, className } = req.query; // optional filters

    let students = [];

    if (batchYear && batchYear !== "all") {
      // Specific batch
      const Student = getStudentModel(Number(batchYear));
      let filter = {};
      if (className && ["A", "B", "C", "D"].includes(className)) {
        filter.className = className;
      }
      students = await Student.find(filter).sort({
        className: 1,
        rollNo: 1,
      });
    } else {
      // All batches - fetch distinct years first
      // We need to import Staff to get active batches, or we can just try a range.
      // Better to use Staff as source of truth for active batches.
      const { default: Staff } = await import("../models/Staff.js");
      const batchYears = await Staff.distinct("batchYear");

      const promises = batchYears.map(async (year) => {
        const Student = getStudentModel(year);
        let filter = {};
        if (className && ["A", "B", "C", "D"].includes(className)) {
          filter.className = className;
        }
        return Student.find(filter);
      });

      const results = await Promise.all(promises);
      students = results.flat().sort((a, b) => {
        // Sort by batchYear first, then className, then rollNo
        if (a.batchYear !== b.batchYear) return a.batchYear - b.batchYear;
        if (a.className !== b.className) return a.className.localeCompare(b.className);
        return a.rollNo.localeCompare(b.rollNo);
      });
    }

    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
