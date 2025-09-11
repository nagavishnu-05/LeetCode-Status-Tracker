import express from "express";
import Student from "../models/Student.js";

const router = express.Router();

// Fetch students stats based on filters
router.get("/", async (req, res) => {
  try {
    const { batchYear, className } = req.query; // optional filters
    let filter = {};

    if (batchYear) filter.batchYear = Number(batchYear);
    if (className && ["A", "B", "C", "D"].includes(className)) {
      filter.className = className;
    }

    const students = await Student.find(filter).sort({
      batchYear: 1,
      className: 1,
      rollNo: 1,
    });

    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
