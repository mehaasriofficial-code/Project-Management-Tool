const Task = require('../models/Task');
const Project = require('../models/Project');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { idOf, isOwner, hasProjectAccess } = require('../utils/permissions');

const populateTask = (query) =>
  query.populate('assignedTo', 'name email').populate('project', 'name owner members');

// @desc    Get tasks — optionally filtered by ?project=:id and/or ?assignedToMe=true
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res, next) => {
  try {
    const { project: projectId, assignedToMe } = req.query;
    const filter = {};

    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }
      if (!hasProjectAccess(project, req.user._id)) {
        return res.status(403).json({ success: false, message: 'You do not have access to this project' });
      }
      filter.project = projectId;
    } else {
      const accessible = await Project.find({
        $or: [{ owner: req.user._id }, { members: req.user._id }]
      }).select('_id');
      filter.project = { $in: accessible.map((p) => p._id) };
    }

    if (assignedToMe === 'true') {
      filter.assignedTo = req.user._id;
    }

    const tasks = await populateTask(Task.find(filter).sort({ createdAt: -1 }));
    res.status(200).json({ success: true, count: tasks.length, tasks });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private (project owner or member)
exports.createTask = async (req, res, next) => {
  try {
    const { title, description, project: projectId, assignedTo, priority, status, dueDate } = req.body;

    if (!title || !projectId) {
      return res.status(400).json({ success: false, message: 'Task title and project are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (!hasProjectAccess(project, req.user._id)) {
      return res.status(403).json({ success: false, message: 'You do not have access to this project' });
    }

    const task = await Task.create({
      title,
      description,
      project: projectId,
      assignedTo: assignedTo || null,
      priority,
      status,
      dueDate: dueDate || undefined
    });

    if (assignedTo) {
      await Notification.create({
        user: assignedTo,
        type: 'task_assigned',
        message: `You were assigned to task "${task.title}"`,
        relatedProject: project._id,
        relatedTask: task._id
      });
    }

    const populated = await populateTask(Task.findById(task._id));
    res.status(201).json({ success: true, task: populated });
  } catch (err) {
    next(err);
  }
};

// @desc    Get a single task
// @route   GET /api/tasks/:id
// @access  Private (project owner or member)
exports.getTask = async (req, res, next) => {
  try {
    const task = await populateTask(Task.findById(req.params.id));
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (!hasProjectAccess(task.project, req.user._id)) {
      return res.status(403).json({ success: false, message: 'You do not have access to this task' });
    }

    res.status(200).json({ success: true, task });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private (project owner or member)
exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('project', 'name owner members');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (!hasProjectAccess(task.project, req.user._id)) {
      return res.status(403).json({ success: false, message: 'You do not have access to this task' });
    }

    const { title, description, assignedTo, priority, status, dueDate } = req.body;
    const previousAssignee = idOf(task.assignedTo);
    const previousStatus = task.status;

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;
    if (dueDate !== undefined) task.dueDate = dueDate || undefined;

    await task.save();

    if (assignedTo && assignedTo !== previousAssignee) {
      await Notification.create({
        user: assignedTo,
        type: 'task_assigned',
        message: `You were assigned to task "${task.title}"`,
        relatedProject: task.project._id,
        relatedTask: task._id
      });
    }

    if (status !== undefined && status !== previousStatus && task.assignedTo) {
      await Notification.create({
        user: task.assignedTo,
        type: 'task_status_changed',
        message: `Task "${task.title}" status changed to ${status}`,
        relatedProject: task.project._id,
        relatedTask: task._id
      });
    }

    const populated = await populateTask(Task.findById(task._id));
    res.status(200).json({ success: true, task: populated });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private (project owner only)
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('project', 'name owner members');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (!isOwner(task.project, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the project owner can delete tasks' });
    }

    await Comment.deleteMany({ task: task._id });
    await Notification.deleteMany({ relatedTask: task._id });
    await task.deleteOne();

    res.status(200).json({ success: true, message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};
