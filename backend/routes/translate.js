const express = require('express');
const authMiddleware = require('../middleware/auth');
const { translate } = require('../services/mlClient');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { text, targetLang, sourceLang } = req.body;
    if (!text || !targetLang)
      return res.status(400).json({ error: 'text and targetLang are required' });
    if (text.length > 2000)
      return res.status(400).json({ error: 'Text too long' });

    const result = await translate(text, targetLang, sourceLang);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Translation failed' });
  }
});

module.exports = router;
