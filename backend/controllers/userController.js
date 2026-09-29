const User = require('../models/User');

// @desc    List all users (for assigning tasks / adding project members)
// @route   GET /api/users
// @access  Private
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('name email createdAt').sort({ name: 1 });
    res.status(200).json({ success: true, count: users.length, users });
  } catch (err) {
    next(err);
  }
};
