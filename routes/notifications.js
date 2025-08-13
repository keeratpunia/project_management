const express = require('express');
const Notification = require('../models/Notification');
const { isLoggedIn } = require('../middleware/auth');

const router = express.Router();

// list notifications
router.get('/notifications', isLoggedIn, async (req, res) => {
  const notes = await Notification.find({ user: req.session.user._id })
    .sort({ createdAt: -1 })
    .limit(100);
  res.render('notifications', { notes });
});

// mark one read
router.post('/notifications/read/:id', isLoggedIn, async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.session.user._id },
    { read: true }
  );
  res.redirect('/notifications');
});

// mark all read
router.post('/notifications/read-all', isLoggedIn, async (req, res) => {
  await Notification.updateMany(
    { user: req.session.user._id, read: false },
    { read: true }
  );
  res.redirect('/notifications');
});

module.exports = router;
