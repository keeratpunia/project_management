const express = require('express');
const router = express.Router();

const Project = require('../models/project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { isLoggedIn } = require('../middleware/auth');
const { canEdit } = require('../middleware/permissions');


console.log('projects.js middlewares:',
 'isLoggedIn:', typeof isLoggedIn,
 'canEdit:', typeof canEdit
);


// HOME — list projects (admin sees all; users see own)
router.get('/', isLoggedIn, async (req, res) => {
  const isAdmin = req.session.user.role === 'admin';
  const filter = isAdmin ? {} : { owner: req.session.user._id };
  const projects = await Project.find(filter).sort({ StartDate: 1 }).populate('owner', 'username');
  res.render('index', { projects });
});

// ADD — form (admin gets user dropdown)
router.get('/add', isLoggedIn, async (req, res) => {
  let users = [];
  if (req.session.user.role === 'admin') {
    users = await User.find({}, 'username');
  }
  res.render('addProject', { users });
});

// ADD — create
router.post('/add', isLoggedIn, async (req, res) => {
  const { projectId, ProjectName, ProjectDescription, StartDate, ProjectEndDate, NoOfModules, ownerId } = req.body;

  const owner = (req.session.user.role === 'admin' && ownerId) ? ownerId : req.session.user._id;

  try {
    const project = await Project.create({
      projectId, ProjectName, ProjectDescription, StartDate, ProjectEndDate,
      NoOfModules: Number(NoOfModules) || 0, owner
    });

    if (req.session.user.role === 'admin' && String(owner) !== String(req.session.user._id)) {
      await Notification.create({
        user: owner,
        message: `Admin ${req.session.user.username} assigned you a new project ${project.projectId}.`
      });
    }

    req.session.flash = 'Project created.';
    res.redirect('/');
  } catch (e) {
    console.error(e);
    res.status(400).send('Could not create project (is Project ID unique?)');
  }
});

// EDIT — page
router.get('/edit/:id', isLoggedIn, canEdit, async (req, res) => {
  let users = [];
  if (req.session.user.role === 'admin') users = await User.find({}, 'username');

  const project = await Project.findById(req.params.id)
    .populate('owner', 'username')
    .populate('modules.assignedBy', 'username');

  if (!project) return res.status(404).send('Project not found');

  const modules = Array.isArray(project.modules) ? project.modules : [];
  const total = modules.length;
  const done = modules.filter(m => m && m.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  res.render('editProject', { project, users, total, done, pct });
});

// EDIT — save (also handles admin reassignment + notifications)
router.post('/edit/:id', isLoggedIn, canEdit, async (req, res) => {
  const { ProjectName, ProjectDescription, StartDate, ProjectEndDate, NoOfModules, ownerId } = req.body;

  const before = await Project.findById(req.params.id); // to compare owner
  const update = {
    ProjectName, ProjectDescription, StartDate, ProjectEndDate,
    NoOfModules: Number(NoOfModules) || 0
  };
  if (req.session.user.role === 'admin' && ownerId) update.owner = ownerId;

  await Project.findByIdAndUpdate(req.params.id, update);

  if (req.session.user.role === 'admin' && ownerId && String(ownerId) !== String(before.owner)) {
    if (before.owner) {
      await Notification.create({
        user: before.owner,
        message: `Admin ${req.session.user.username} reassigned your project ${before.projectId}.`
      });
    }
    await Notification.create({
      user: ownerId,
      message: `Admin ${req.session.user.username} assigned project ${before.projectId} to you.`
    });
  }

  res.redirect('/edit/' + req.params.id);
});

// DELETE project (owner or admin) — notifies owner if admin deleted
router.post('/delete/:id', isLoggedIn, canEdit, async (req, res) => {
  const p = await Project.findById(req.params.id);
  await Project.findByIdAndDelete(req.params.id);

  if (req.session.user.role === 'admin' && p?.owner) {
    await Notification.create({
      user: p.owner,
      message: `Admin ${req.session.user.username} deleted your project ${p.projectId}.`
    });
  }
  res.redirect('/');
});

module.exports = router;
