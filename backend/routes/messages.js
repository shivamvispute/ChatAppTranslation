const express = require('express');
const Message = require('../models/Message');
const authMiddleware = require('../middleware/auth');
const { translate } = require('../services/mlClient');

const router = express.Router();

router.get('/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const targetLang = req.query.lang || req.user.preferredLanguage || 'EN';

    const messages = await Message.find({ room: roomId })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    messages.reverse();

    const translated = await Promise.all(
      messages.map(async (msg) => {
        if (msg.detectedLanguage && msg.detectedLanguage.toUpperCase() === targetLang.toUpperCase()) {
          return { ...msg, translatedText: null, translationSource: null };
        }
        const result = await translate(msg.text, targetLang, msg.detectedLanguage);
        return {
          ...msg,
          translatedText: result.translatedText !== msg.text ? result.translatedText : null,
          translationSource: result.source,
          translationLatencyMs: result.latencyMs,
        };
      })
    );

    res.json({ messages: translated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
