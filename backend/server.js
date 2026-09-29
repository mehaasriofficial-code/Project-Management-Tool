const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// --- API routes ---
// The nested comments route is mounted before /api/tasks so that
// /api/tasks/:taskId/comments is matched by its own router first.
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/tasks/:taskId/comments', require('./routes/taskCommentRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));

// --- Serve the frontend ---
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Any other GET request that isn't an API call falls back to index.html
// (plain function middleware, not a '*' path pattern, so it isn't sensitive
// to which Express/path-to-regexp version ends up installed).
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Anything left over (unknown API routes, non-GET misses) is a clean 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
