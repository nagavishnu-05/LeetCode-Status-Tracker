import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

function extractUsername(input) {
  if (!input) return '';
  if (input.includes('leetcode.com')) {
    input = input.endsWith('/') ? input.slice(0, -1) : input;
    return input.split('/').pop();
  }
  return input;
}

// Fetch stats from external API
router.get('/leetcode/:username', async (req, res) => {
  try {
    const username = extractUsername(req.params.username);
    const response = await fetch(`https://leetcode-stats-api.vercel.app/${username}`);

    if (!response.ok) return res.status(response.status).json({ error: 'API error' });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch LeetCode stats' });
  }
});

export default router;
