import express from 'express';
import axios from 'axios';
import ExcelJS from 'exceljs';
import Staff from '../models/Staff.js';
import Student from '../models/Student.js';

const router = express.Router();

async function getLeetCodeStats(username) {
  try {
    const { data } = await axios.get(
      `https://leetcode-stats-api.vercel.app/${username}`
    );
    return {
      easy: data.easySolved || 0,
      medium: data.mediumSolved || 0,
      hard: data.hardSolved || 0,
      total: data.totalSolved || 0,
    };
  } catch {
    return { easy: '-', medium: '-', hard: '-', total: '-' };
  }
}

router.get('/:staffId', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.staffId);
    if (!staff) return res.status(404).send('Staff not found');

    const students = await Student.find({
      className: staff.className,
      batchYear: staff.batchYear,
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('LeetCode Stats');

    sheet.addRow([
      'S.No.',
      'Roll No.',
      'Register No.',
      'Name',
      'LeetCode Link',
      'Easy',
      'Medium',
      'Hard',
      'Total',
    ]);

    let count = 1;
    for (const student of students) {
      let stats = { easy: '-', medium: '-', hard: '-', total: '-' };
      if (student.leetcodeLink) {
        const username = student.leetcodeLink.split('/').filter(Boolean).pop();
        stats = await getLeetCodeStats(username);
      }

      sheet.addRow([
        count++,
        student.rollNo,
        student.registerNo,
        student.name,
        student.leetcodeLink || '-',
        stats.easy,
        stats.medium,
        stats.hard,
        stats.total,
      ]);
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=LeetCode_Report_${staff.name}.xlsx`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating report');
  }
});

export default router;
