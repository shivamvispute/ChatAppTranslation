const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const SUPPORTED_LANGUAGES = ['BG','CS','DA','DE','EL','EN','ES','ET','FI','FR','HU','ID','IT','JA','KO','LT','LV','NB','NL','PL','PT','RO','RU','SK','SL','SV','TR','UK','ZH'];

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, preferredLanguage = 'EN' } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields are required' });

    if (!SUPPORTED_LANGUAGES.includes(preferredLanguage.toUpperCase()))
      return res.status(400).json({ error: 'Unsupported language' });

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing)
      return res.status(409).json({ error: 'Email or username already in use' });

    const user = await User.create({ username, email, password, preferredLanguage: preferredLanguage.toUpperCase() });

    const token = jwt.sign(
      { id: user._id, username: user.username, preferredLanguage: user.preferredLanguage },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, username: user.username, preferredLanguage: user.preferredLanguage },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: user.toSafeObject() });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: user.toSafeObject() });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/language', require('../middleware/auth'), async (req, res) => {
  try {
    const { preferredLanguage } = req.body;
    if (!SUPPORTED_LANGUAGES.includes(preferredLanguage?.toUpperCase()))
      return res.status(400).json({ error: 'Unsupported language' });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { preferredLanguage: preferredLanguage.toUpperCase() },
      { new: true }
    ).select('-password');

    res.json({ user: user.toSafeObject() });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
