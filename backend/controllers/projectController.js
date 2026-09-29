const Project = require('../models/Project');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { isOwner, hasProjectAccess } = require('../utils/permissions');

const populateProject = (query) =>
  query.populate('owner', 'name email').populate('members', 'name email');

// @desc    Get all projects the logged-in user owns or is a member of
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res, next) => {
  try {
    const projects = await populateProject(
      Project.find({ $or: [{ owner: req.user._id }, { members: req.user._id }] }).sort({ createdAt: -1 })
    );
    res.status(200).json({ success: true, count: projects.length, projects });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a project
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res, next) => {
  try {
    const { name, description, status, startDate, dueDate, members } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Project name is required' });
    }

    const project = await Project.create({
      name,
      description,
      status,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      owner: req.user._id,
      members: members || []
    });

    if (members && members.length) {
      await Promise.all(members.map((memberId) => Notification.create({
        user: memberId,
        type: 'project_invitation',
        message: `You were added to the project "${project.name}"`,
        relatedProject: project._id
      })));
    }

    const populated = await populateProject(Project.findById(project._id));
    res.status(201).json({ success: true, project: populated });
  } catch (err) {
    next(err);
  }
};

// @desc    Get a single project
// @route   GET /api/projects/:id
// @access  Private (owner or member)
exports.getProject = async (req, res, next) => {
  try {
    const project = await populateProject(Project.findById(req.params.id));
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (!hasProjectAccess(project, req.user._id)) {
      return res.status(403).json({ success: false, message: 'You do not have access to this project' });
    }

    res.status(200).json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a project (including its member list)
// @route   PUT /api/projects/:id
// @access  Private (owner only)
exports.updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (!isOwner(project, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the project owner can edit this project' });
    }

    const { name, description, status, startDate, dueDate, members } = req.body;
    const previousMembers = project.members.map((m) => m.toString());

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (status !== undefined) project.status = status;
    if (startDate !== undefined) project.startDate = startDate || undefined;
    if (dueDate !== undefined) project.dueDate = dueDate || undefined;
    if (members !== undefined) project.members = members;

    await project.save();

    if (members !== undefined) {
      const newMembers = members.filter((m) => !previousMembers.includes(m.toString()));
      await Promise.all(newMembers.map((memberId) => Notification.create({
        user: memberId,
        type: 'project_invitation',
        message: `You were added to the project "${project.name}"`,
        relatedProject: project._id
      })));
    }

    const populated = await populateProject(Project.findById(project._id));
    res.status(200).json({ success: true, project: populated });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a project (and its tasks/comments)
// @route   DELETE /api/projects/:id
// @access  Private (owner only)
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (!isOwner(project, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the project owner can delete this project' });
    }

    const tasks = await Task.find({ project: project._id }).select('_id');
    const taskIds = tasks.map((t) => t._id);

    await Comment.deleteMany({ task: { $in: taskIds } });
    await Task.deleteMany({ project: project._id });
    await Notification.deleteMany({ relatedProject: project._id });
    await project.deleteOne();

    res.status(200).json({ success: true, message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
};
