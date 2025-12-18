import express from "express";
import Staff from "../models/Staff.js";
import { getStudentModel } from "../models/Student.js";

const router = express.Router();

// Get all staff
router.get("/", async (req, res) => {
  try {
    const staffs = await Staff.find({}, "name className batchYear");
    res.json(staffs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get students of a staff by staffId
router.get("/:staffId/students", async (req, res) => {
  try {
    const staff = await Staff.findOne({ name: req.params.staffId });
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    // Get the model for this batch year
    const Student = getStudentModel(staff.batchYear);

    const students = await Student.find({
      className: staff.className,
    }).sort({ rollNo: 1 });

    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get unique batchYears and classNames
router.get("/distinct", async (req, res) => {
  try {
    const batchYears = await Staff.distinct("batchYear");
    const classNames = await Staff.distinct("className");
    res.json({ batchYears, classNames });
  } catch (err) {
    console.error("❌ Error fetching distinct values:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
