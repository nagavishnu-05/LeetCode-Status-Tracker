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
    const rawBatchYears = await Staff.distinct("batchYear");
    const classNames = await Staff.distinct("className");

    // Filter batchYears to only include those that HAVE collections in the DB
    const mongoose = (await import("mongoose")).default;
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connection.asPromise();
    }
    const collections = await mongoose.connection.db.listCollections().toArray();
    const existingCollections = collections.map(c => c.name);

    const validBatchYears = rawBatchYears.filter(year => {
      const collectionName = `${year}-${year + 4}`;
      return existingCollections.includes(collectionName);
    });

    res.json({ batchYears: validBatchYears, classNames });
  } catch (err) {
    console.error("❌ Error fetching distinct values:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
