import express from "express";
import Staff from "../models/Staff.js";
import Student from "../models/Student.js";

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
    const staff = await Staff.findById(req.params.staffId);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    const students = await Student.find({
      className: staff.className,
      batchYear: staff.batchYear,
    }).sort({ rollNo: 1 });

    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
