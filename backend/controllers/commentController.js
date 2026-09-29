const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { hasProjectAccess } = require('../utils/permissions');

// @desc    Get comments for a task
// @route   GET /api/tasks/:taskId/comments
// @access  Private (project owner or member)
exports.getComments = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId).populate('project', 'name owner members');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (!hasProjectAccess(task.project, req.user._id)) {
      return res.status(403).json({ success: false, message: 'You do not have access to this task' });
    }

    const comments = await Comment.find({ task: req.params.taskId })
      .populate('user', 'name email')
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, count: comments.length, comments });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a comment to a task
// @route   POST /api/tasks/:taskId/comments
// @access  Private (project owner or member)
exports.addComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    const task = await Task.findById(req.params.taskId).populate('project', 'name owner members');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (!hasProjectAccess(task.project, req.user._id)) {
      return res.status(403).json({ success: false, message: 'You do not have access to this task' });
    }

    const comment = await Comment.create({
      task: task._id,
      user: req.user._id,
      content: content.trim()
    });

    if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
      await Notification.create({
        user: task.assignedTo,
        type: 'new_comment',
        message: `New comment on task "${task.title}"`,
        relatedProject: task.project._id,
        relatedTask: task._id
      });
    }

    const populated = await Comment.findById(comment._id).populate('user', 'name email');
    res.status(201).json({ success: true, comment: populated });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete your own comment
// @route   DELETE /api/comments/:id
// @access  Private (comment author only)
exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own comments' });
    }

    await comment.deleteOne();
    res.status(200).json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
};
