import express from 'express';
import Staff from '../models/Staff.js';
import Student from '../models/Student.js';

const router = express.Router();

// Get all staff
router.get('/', async (req, res) => {
  try {
    const staffs = await Staff.find({}, 'name className batchYear');
    console.table(
      staffs.map((s) => ({
        Name: s.name,
        Class: s.className,
        Batch: s.batchYear,
      }))
    );
    res.json(staffs);
  } catch (err) {
    console.error('Error fetching staff', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get students of a staff by staffName
router.get('/:staffName/students', async (req, res) => {
  try {
    const { staffName } = req.params;
    const staff = await Staff.findOne({ name: staffName });

    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    const students = await Student.find({
      className: staff.className,
      batchYear: staff.batchYear,
    });

    console.log(
      `Students of Staff: ${staff.name} (Class ${staff.className}, Batch ${staff.batchYear})`
    );
    console.table(
      students.map((s) => ({
        RollNo: s.rollNo,
        RegisterNo: s.registerNo,
        Name: s.name,
        LeetCode: s.leetcodeLink || 'Not Interested',
      }))
    );

    res.json(students);
  } catch (err) {
    console.error('Error fetching staff’s students', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
