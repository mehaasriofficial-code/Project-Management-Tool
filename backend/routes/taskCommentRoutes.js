// Mounted at /api/tasks/:taskId/comments — mergeParams lets this router see :taskId.
const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const { getComments, addComment } = require('../controllers/commentController');

router.route('/')
  .get(protect, getComments)
  .post(protect, addComment);

module.exports = router;
