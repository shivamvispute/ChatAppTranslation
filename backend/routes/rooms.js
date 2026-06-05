const express = require('express');
const Room = require('../models/Room');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find().sort({ createdAt: 1 }).select('-__v');
    res.json({ rooms });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description = '' } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ error: 'Room name is required' });

    const normalized = name.trim().toLowerCase().replace(/\s+/g, '-');
    const existing = await Room.findOne({ name: normalized });
    if (existing) return res.status(409).json({ error: 'Room already exists' });

    const room = await Room.create({ name: normalized, description, createdBy: req.user.id });
    res.status(201).json({ room });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
