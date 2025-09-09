import express from 'express';
import axios from 'axios';
import Staff from '../models/Staff.js';
import Student from '../models/Student.js';

const router = express.Router();

// Get rankings for all students with optional batch year and class filters
router.get('/rankings', async (req, res) => {
  try {
    const { batchYear, className } = req.query;
    let query = {};

    // Apply filters if provided
    if (batchYear) query.batchYear = batchYear;
    if (className) query.className = className;

    const students = await Student.find(query).sort({ rollNo: 1 });

    // Map through students and get their current stats
    const studentsWithStats = students.map(student => {
      const history = student.statsHistory;
      let currentStats = { easy: 0, medium: 0, hard: 0, total: 0 };

      if (history && history.length > 0) {
        const latest = history[history.length - 1];
        currentStats = {
          easy: latest.easy || 0,
          medium: latest.medium || 0,
          hard: latest.hard || 0,
          total: latest.total || 0
        };
      }

      return {
        _id: student._id,
        rollNo: student.rollNo,
        name: student.name,
        className: student.className,
        batchYear: student.batchYear,
        curr: currentStats
      };
    });

    // Sort by total problems solved in descending order
    const sortedStudents = studentsWithStats.sort((a, b) => b.curr.total - a.curr.total);

    res.json(sortedStudents);
  } catch (err) {
    console.error('Error fetching rankings:', err);
    res.status(500).json({ message: 'Error fetching rankings' });
  }
});

// Fetch all students for a staff with updated stats
router.get('/:staffId', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.staffId);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    const students = await Student.find({
      className: staff.className,
      batchYear: staff.batchYear
    }).sort({ rollNo: 1 });

    // Fetch stats in parallel
    await Promise.all(
      students.map(async (student) => {
        if (student.leetcodeLink) {
          try {
            const username = student.leetcodeLink.split('/').filter(Boolean).pop();
            const { data } = await axios.get(`https://leetcode-stats-api.vercel.app/${username}`);

            const stats = {
              easy: data.easySolved ?? 0,
              medium: data.mediumSolved ?? 0,
              hard: data.hardSolved ?? 0,
              total: data.totalSolved ?? 0
            };

            // Add new stats snapshot
            student.statsHistory.push({ date: new Date(), ...stats });

            // Keep only last 2 snapshots
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
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
