const express = require('express');
const authMiddleware = require('../middleware/auth');
const { semanticSearch, getMLMetrics } = require('../services/mlClient');

const router = express.Router();

router.get('/messages', authMiddleware, async (req, res) => {
  try {
    const { q, roomId, topK = 5 } = req.query;
    if (!q || !roomId) return res.status(400).json({ error: 'q and roomId are required' });
    const results = await semanticSearch(q, roomId, Number(topK));
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

router.get('/ml-metrics', authMiddleware, async (req, res) => {
  try {
    const metrics = await getMLMetrics();
    res.json(metrics);
  } catch {
    res.status(503).json({ error: 'ML service unavailable' });
  }
});

module.exports = router;
