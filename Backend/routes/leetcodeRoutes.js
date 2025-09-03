import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Helper: Extract username from link
function extractUsername(input) {
  try {
    if (input.includes('leetcode.com')) {
      input = input.endsWith('/') ? input.slice(0, -1) : input;
      return input.split('/').pop();
    }
    return input;
  } catch {
    return input;
  }
}

// Get stats for a username
router.get('/leetcode/:username', async (req, res) => {
  try {
    let username = extractUsername(req.params.username);
    const response = await fetch(
      `https://leetcode-stats-api.vercel.app/${username}`
    );

    if (!response.ok)
      return res.status(response.status).json({ error: 'API error' });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Error fetching LeetCode stats:', err);
    res.status(500).json({ error: 'Failed to fetch LeetCode stats' });
  }
});

export default router;
