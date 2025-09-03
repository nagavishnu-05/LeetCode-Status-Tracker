import express from 'express';
import Student from '../models/Student.js';

const router = express.Router();

router.get('/:className/:batchYear', async (req, res) => {
  try {
    const { className, batchYear } = req.params;

    if (!['A', 'B', 'C'].includes(className)) {
      return res.status(400).json({ message: 'Invalid className' });
    }

    const students = await Student.find({
      className,
      batchYear: Number(batchYear),
    });

    console.log(`Students Fetched for Class ${className} Batch ${batchYear}`);
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
    console.error('Error fetching students', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
