const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    projectId:          { type: String, required: true, unique: true }, // e.g., Pro1001
    ProjectName:        { type: String, required: true },
    ProjectDescription: { type: String },
    StartDate:          { type: Date },
    ProjectEndDate:     { type: Date },
    NoOfModules:        { type: Number, default: 0 },

    // who owns/created this project
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // modules for this project
    modules: [
      {
        name:       { type: String, required: true },
        done:       { type: Boolean, default: false },
        assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        assignedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { collection: 'Project_Master', timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
