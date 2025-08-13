// Require login for protected routes
function isLoggedIn(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

module.exports = { isLoggedIn }; 
