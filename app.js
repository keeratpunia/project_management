// -------------------------------------------------
// Load environment variables from .env
// -------------------------------------------------
require('dotenv').config();

// -------------------------------------------------
// Core imports
// -------------------------------------------------
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Models used in top-level middleware (routes import their own models)
const Notification = require('./models/Notification');

const app = express();

// -------------------------------------------------
// Config from env (with sensible defaults)
// -------------------------------------------------
const {
  PORT = 3000,
  NODE_ENV = 'development',
  MONGO_URI,
  SESSION_SECRET,
} = process.env;

// Fail fast if secrets are missing
if (!MONGO_URI) {
  console.error('❌ MONGO_URI is missing. Add it to your .env');
  process.exit(1);
}
if (!SESSION_SECRET) {
  console.error('❌ SESSION_SECRET is missing. Generate one and put it in .env');
  process.exit(1);
}

// If behind a proxy (Render/Heroku/NGINX), keep secure cookies working
if (NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// -------------------------------------------------
// Views + parsers + static assets
// -------------------------------------------------
app.set('views', path.join(__dirname, 'views')); // where .ejs templates live
app.set('view engine', 'ejs');                   // use EJS templates
app.use(express.urlencoded({ extended: true })); // parse HTML form bodies into req.body

// serve everything in /public at the site root, e.g. /css/auth.css
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------
// Database
// -------------------------------------------------
mongoose
  .connect(MONGO_URI /* , { serverSelectionTimeoutMS: 10000, family: 4 } */)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error(err));

// -------------------------------------------------
// Sessions (kept in Mongo so logins persist)
// -------------------------------------------------
app.use(
  session({
    secret: SESSION_SECRET,                // long & random; signs the session cookie
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: {
      httpOnly: true,                      // JS on the page can’t read the cookie
      maxAge: 1000 * 60 * 60 * 4,          // 4 hours
      secure: NODE_ENV === 'production',   // only over HTTPS in prod
      sameSite: NODE_ENV === 'production' ? 'lax' : 'lax',
    },
  })
);

// -------------------------------------------------
// Locals available to every EJS view
// -------------------------------------------------

// current user (for conditional UI & role checks)
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// simple "flash" message (set req.session.flash = '...' before redirect)
app.use((req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash; // show once then clear
  next();
});

// unread notifications badge in the header
app.use(async (req, res, next) => {
  try {
    res.locals.unreadCount = 0;
    if (req.session.user) {
      res.locals.unreadCount = await Notification.countDocuments({
        user: req.session.user._id,
        read: false,
      });
    }
    next();
  } catch (e) {
    next(e);
  }
});

// -------------------------------------------------
// Routes (split out for cleanliness)
// -------------------------------------------------
app.use(require('./routes/auth'));           // /login /register /logout
app.use(require('./routes/projects'));       // /, /add, /edit/:id, /delete/:id
app.use(require('./routes/modules'));        // /projects/:id/modules/...
app.use(require('./routes/notifications'));  // /notifications...

// -------------------------------------------------
// Error handler (surface template/route errors)
// -------------------------------------------------
app.use((err, req, res, next) => {
  console.error('Render error:', err);
  res.status(500).send('Template error. Check terminal for details.');
});

// -------------------------------------------------
// Start server
// -------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT} (${NODE_ENV})`);
});
