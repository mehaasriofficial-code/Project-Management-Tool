// Mounted at /api/comments — separate from the nested task-comments router
// because DELETE /api/comments/:id is a top-level resource path per the spec.
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { deleteComment } = require('../controllers/commentController');

router.delete('/:id', protect, deleteComment);

module.exports = router;
