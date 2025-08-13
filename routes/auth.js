const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const router = express.Router();

// login + register pages
router.get('/login', (req, res) => res.render('login', { error: null }));
router.get('/register', (req, res) => res.render('register', { error: null }));

// create account -> login
router.post('/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash, role: role || 'user' });
    req.session.user = { _id: user._id, username: user.username, role: user.role };
    res.redirect('/');
  } catch (e) {
    console.error(e);
    res.render('register', { error: 'Username taken or invalid input' });
  }
});

// login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.render('login', { error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.render('login', { error: 'Invalid credentials' });

  req.session.user = { _id: user._id, username: user.username, role: user.role };
  res.redirect('/');
});

// logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
