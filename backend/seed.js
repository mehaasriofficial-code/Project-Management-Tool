// Populates the database with demo users, projects, tasks, comments and
// notifications so the app has something to look at on first run.
// Run with: npm run seed  (wipes existing data first)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Comment = require('./models/Comment');
const Notification = require('./models/Notification');

const seed = async () => {
  await connectDB();

  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany(),
    Project.deleteMany(),
    Task.deleteMany(),
    Comment.deleteMany(),
    Notification.deleteMany()
  ]);

  console.log('Creating demo users...');
  const owner = await User.create({ name: 'Alex Morgan', email: 'owner@demo.com', password: 'password123' });
  const developer = await User.create({ name: 'Jordan Lee', email: 'developer@demo.com', password: 'password123' });
  const designer = await User.create({ name: 'Sam Rivera', email: 'designer@demo.com', password: 'password123' });

  console.log('Creating demo projects...');
  const website = await Project.create({
    name: 'Website Redesign',
    description: 'Redesign the marketing website with a new visual identity and improved performance.',
    status: 'Active',
    owner: owner._id,
    members: [developer._id, designer._id],
    startDate: new Date('2026-08-01'),
    dueDate: new Date('2026-11-01')
  });

  const mobileApp = await Project.create({
    name: 'Mobile App Launch',
    description: 'Plan and execute the launch of the v1 mobile application.',
    status: 'Planning',
    owner: owner._id,
    members: [developer._id],
    startDate: new Date('2026-09-15'),
    dueDate: new Date('2027-01-15')
  });

  const internalTools = await Project.create({
    name: 'Internal Tools Cleanup',
    description: 'Consolidate and document internal engineering tools.',
    status: 'Completed',
    owner: owner._id,
    members: [developer._id, designer._id],
    startDate: new Date('2026-05-01'),
    dueDate: new Date('2026-07-01')
  });

  console.log('Creating demo tasks...');
  const tasks = await Task.insertMany([
    { title: 'Design new homepage layout', description: 'Create high-fidelity mockups for the homepage.', project: website._id, assignedTo: designer._id, priority: 'High', status: 'In Progress', dueDate: new Date('2026-10-01') },
    { title: 'Set up CI/CD pipeline', description: 'Automate build and deploy for the website repo.', project: website._id, assignedTo: developer._id, priority: 'Medium', status: 'To Do', dueDate: new Date('2026-10-10') },
    { title: 'Write homepage copy', description: 'Draft and finalize homepage marketing copy.', project: website._id, assignedTo: owner._id, priority: 'Medium', status: 'Review', dueDate: new Date('2026-09-28') },
    { title: 'Audit current site performance', description: 'Run Lighthouse audits on all key pages.', project: website._id, assignedTo: developer._id, priority: 'Low', status: 'Completed', dueDate: new Date('2026-09-05') },
    { title: 'Define MVP feature set', description: 'List the must-have features for v1.', project: mobileApp._id, assignedTo: owner._id, priority: 'High', status: 'In Progress', dueDate: new Date('2026-09-30') },
    { title: 'Wireframe onboarding flow', description: 'Sketch the first-run onboarding experience.', project: mobileApp._id, assignedTo: developer._id, priority: 'Medium', status: 'To Do', dueDate: new Date('2026-10-15') },
    { title: 'Archive deprecated scripts', description: 'Move unused internal scripts to the archive repo.', project: internalTools._id, assignedTo: developer._id, priority: 'Low', status: 'Completed', dueDate: new Date('2026-06-20') },
    { title: 'Document deployment process', description: 'Write a runbook for the deployment process.', project: internalTools._id, assignedTo: designer._id, priority: 'Medium', status: 'Completed', dueDate: new Date('2026-06-28') }
  ]);

  console.log('Creating demo comments...');
  await Comment.insertMany([
    { task: tasks[0]._id, user: owner._id, content: 'Loving the direction so far — can we try a lighter background?', createdAt: new Date('2026-09-18') },
    { task: tasks[0]._id, user: designer._id, content: 'Sure, updating the mockup now.', createdAt: new Date('2026-09-19') },
    { task: tasks[1]._id, user: developer._id, content: 'Blocked on getting access to the deploy keys.', createdAt: new Date('2026-09-20') },
    { task: tasks[4]._id, user: owner._id, content: 'Let\'s keep the MVP list under 10 features.', createdAt: new Date('2026-09-21') }
  ]);

  console.log('Creating demo notifications...');
  await Notification.insertMany([
    { user: designer._id, type: 'task_assigned', message: 'You were assigned to task "Design new homepage layout"', relatedProject: website._id, relatedTask: tasks[0]._id, read: false },
    { user: developer._id, type: 'new_comment', message: 'New comment on task "Set up CI/CD pipeline"', relatedProject: website._id, relatedTask: tasks[1]._id, read: false }
  ]);

  console.log('\nSeed complete.\n');
  console.log('Demo accounts (password for all: password123):');
  console.log('  Owner:     owner@demo.com');
  console.log('  Developer: developer@demo.com');
  console.log('  Designer:  designer@demo.com');

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
