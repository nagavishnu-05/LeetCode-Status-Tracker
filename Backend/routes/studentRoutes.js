import express from "express";
import { getStudentModel } from "../models/Student.js";

const router = express.Router();

// Get students by class and batch
router.get("/:className/:batchYear", async (req, res) => {
  try {
    const { className, batchYear } = req.params;
    if (!["A", "B", "C", "D"].includes(className)) {
      return res.status(400).json({ message: "Invalid className" });
    }

    // Get the model for this batch year
    const Student = getStudentModel(Number(batchYear));

    const students = await Student.find({
      className,
    }).sort({ rollNo: 1 });

    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
