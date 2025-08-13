const Project = require('../models/project');

// Allow only owner or admin to proceed on routes with :id (project id)
async function canEdit(req, res, next) {
  try {
    const p = await Project.findById(req.params.id).populate('owner', 'username');
    if (!p) return res.status(404).send('Project not found');

    const isAdmin = req.session.user.role === 'admin';
    const isOwner = p.owner && String(p.owner._id) === String(req.session.user._id);

    if (!(isAdmin || isOwner)) return res.status(403).send('Forbidden');
    req.project = p; // stash for next handlers if needed
    next();
  } catch (e) {
    console.error(e);
    res.status(500).send('Server error');
  }
}

module.exports = { canEdit };
