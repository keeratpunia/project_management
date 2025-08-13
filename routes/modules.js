const express = require('express');
const Project = require('../models/project');
const Notification = require('../models/Notification');
const { isLoggedIn } = require('../middleware/auth');
const { canEdit } = require('../middleware/permissions');

const router = express.Router();

// add module
router.post('/projects/:id/modules/add', isLoggedIn, canEdit, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).send('Module name required');

  const proj = await Project.findByIdAndUpdate(
    req.params.id,
    {
      $push: { modules: { name: name.trim(), assignedBy: req.session.user._id } },
      $inc: { NoOfModules: 1 }
    },
    { new: true }
  );

  if (req.session.user.role === 'admin' && proj?.owner && String(proj.owner) !== String(req.session.user._id)) {
    await Notification.create({
      user: proj.owner,
      message: `Admin ${req.session.user.username} added a module "${name.trim()}" to your project ${proj.projectId}.`
    });
  }

  res.redirect('/edit/' + req.params.id);
});

// toggle module done
router.post('/projects/:id/modules/:mindex/toggle', isLoggedIn, canEdit, async (req, res) => {
  const p = await Project.findById(req.params.id);
  const i = Number(req.params.mindex);
  if (!p || Number.isNaN(i) || !p.modules[i]) return res.status(404).send('Module not found');

  p.modules[i].done = !p.modules[i].done;
  await p.save();

  res.redirect('/edit/' + req.params.id);
});

// delete module
router.post('/projects/:id/modules/:mindex/delete', isLoggedIn, canEdit, async (req, res) => {
  const i = Number(req.params.mindex);
  const p = await Project.findById(req.params.id);
  if (!p || Number.isNaN(i) || !p.modules[i]) return res.status(404).send('Module not found');

  const removedName = p.modules[i].name;
  p.modules.splice(i, 1);
  p.NoOfModules = Math.max(0, (p.NoOfModules || 0) - 1);
  await p.save();

  if (req.session.user.role === 'admin' && p.owner && String(p.owner) !== String(req.session.user._id)) {
    await Notification.create({
      user: p.owner,
      message: `Admin ${req.session.user.username} deleted module "${removedName}" from your project ${p.projectId}.`
    });
  }

  res.redirect('/edit/' + req.params.id);
});

module.exports = router;
