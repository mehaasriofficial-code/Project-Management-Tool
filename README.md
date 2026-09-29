# Project Management Tool

A collaborative project management tool, in the spirit of Trello or Asana: create projects, organize work on a status board, assign tasks, and discuss them in comments. Built as a real, working full-stack application — vanilla HTML/CSS/JS on the frontend, Node.js/Express/MongoDB on the backend.

## Features

- **Authentication** — registration, login, JWT-based sessions, hashed passwords, persistent login (a stored token is validated against the server on every page load), logout.
- **Dashboard** — project and task counts, recent projects, recent tasks.
- **Projects** — create, view, edit, delete; status (Planning / Active / Completed), description, start/due dates, owner, and members.
- **Task board** — one board per project with To Do / In Progress / Review / Completed columns.
- **Tasks** — create, edit, delete, assign, prioritize (Low/Medium/High), set due dates, change status from the board or from the task's own page.
- **Comments** — threaded discussion on each task; anyone with access to the task can post, only the author can delete their own comment.
- **Members & authorization** — the project owner can add registered users as members; members can view the project, see and update their tasks, and comment. Only the owner can edit/delete the project or delete tasks (see **Authorization rules** below).
- **Notifications** — a database-backed notification list (no websockets needed) for task assignment, task status changes, new comments, and project invitations, shown from a bell menu in the top bar.
- **UI** — responsive sidebar layout that collapses to a slide-out menu on mobile, modals for create/edit forms, status and priority badges, empty states, loading states, and toast/inline error messages.

No personal branding, developer names, logos, or watermarks are included anywhere in the app, per the task brief.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript (no framework, no build step) |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| Auth | JSON Web Tokens (JWT), bcrypt password hashing |
| API | REST, JSON |

The Express server serves both the API and the static frontend from one process, so there is only one thing to start.

## Project structure

```
project-management-tool/
├── backend/
│   ├── config/db.js               MongoDB connection
│   ├── controllers/               Route handlers (auth, project, task, comment, user, notification)
│   ├── middleware/                JWT auth guard + central error handler
│   ├── models/                    Mongoose schemas: User, Project, Task, Comment, Notification
│   ├── routes/                    Express routers, one per resource
│   ├── utils/permissions.js       Shared owner/member access-check helpers
│   ├── seed.js                    Demo data script
│   ├── server.js                  App entry point
│   └── .env.example
├── frontend/
│   ├── index.html, login.html, register.html
│   ├── dashboard.html, projects.html, tasks.html   (tasks.html = "My Tasks", added beyond
│   ├── project.html, task.html, profile.html        the brief's file list to give the "My
│   │                                                 Tasks" nav item its own page)
│   ├── css/style.css
│   └── js/
│       ├── api.js       fetch wrapper, shared helpers (escapeHtml, formatDate, toasts)
│       ├── auth.js      session helpers + login/register form logic
│       ├── layout.js    shared sidebar/topbar/notification-bell, injected on every protected page
│       └── dashboard.js, projects.js, tasks.js, project.js, taskDetail.js, profile.js
├── package.json
├── .gitignore
└── README.md
```

## Getting started

### Prerequisites

- Node.js 18 or later
- A MongoDB database — either a local MongoDB server or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### 1. Install dependencies

From the project root:

```
npm install
```

### 2. Configure environment variables

```
cp backend/.env.example backend/.env
```

Then edit `backend/.env`:

```
MONGODB_URI=mongodb://localhost:27017/project-management-tool
JWT_SECRET=replace_this_with_a_long_random_string
JWT_EXPIRE=7d
PORT=5000
```

For Atlas, `MONGODB_URI` looks like `mongodb+srv://<user>:<password>@<cluster>/project-management-tool`.

### 3. Seed demo data (recommended)

```
npm run seed
```

This wipes and repopulates the database with 3 demo users, 3 projects, 8 tasks, comments, and a couple of notifications.

### 4. Start the server

```
npm start
```

or, for auto-restart while you work on it:

```
npm run dev
```

Open **http://localhost:5000** — the same server serves the API and the frontend, so there's nothing else to run.

### Demo accounts

All demo accounts use the password `password123`.

| Role | Email |
|---|---|
| Project owner | owner@demo.com |
| Developer (member) | developer@demo.com |
| Designer (member) | designer@demo.com |

## Authorization rules

- **Project** — only the owner can edit the project (including its member list) or delete it. The owner and any member can view it.
- **Task** — the owner and any project member can create tasks and update a task (status, assignee, priority, etc.). Only the project owner can delete a task, so members can't remove each other's work.
- **Comment** — anyone with access to the task can add a comment. Only the comment's author can delete it.
- All of the above is enforced server-side, not just hidden in the UI.

## API documentation

Base path: `/api`. All routes except register/login require `Authorization: Bearer <token>`.

**Auth**
| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password }` | Returns `{ token, user }` |
| POST | `/auth/login` | `{ email, password }` | Returns `{ token, user }` |
| GET | `/auth/me` | — | Added beyond the brief's 2 routes to validate a stored token on page load (supports "persistent authentication") |

**Projects**
| Method | Route | Notes |
|---|---|---|
| GET | `/projects` | Projects you own or are a member of |
| POST | `/projects` | `{ name, description, status, startDate, dueDate, members[] }` |
| GET | `/projects/:id` | |
| PUT | `/projects/:id` | Owner only |
| DELETE | `/projects/:id` | Owner only — cascades to its tasks, comments, notifications |

**Tasks**
| Method | Route | Notes |
|---|---|---|
| GET | `/tasks` | Supports `?project=:id` and `?assignedToMe=true` |
| POST | `/tasks` | `{ title, description, project, assignedTo, priority, status, dueDate }` |
| GET | `/tasks/:id` | |
| PUT | `/tasks/:id` | Owner or member |
| DELETE | `/tasks/:id` | Owner only |

**Comments**
| Method | Route | Notes |
|---|---|---|
| GET | `/tasks/:taskId/comments` | |
| POST | `/tasks/:taskId/comments` | `{ content }` |
| DELETE | `/comments/:id` | Author only |

**Users**
| Method | Route | Notes |
|---|---|---|
| GET | `/users` | Used to populate assignee / member pickers |

**Notifications** *(bonus feature)*
| Method | Route | Notes |
|---|---|---|
| GET | `/notifications` | Newest 50, plus unread count |
| PUT | `/notifications/:id/read` | |
| PUT | `/notifications/read-all` | |

## Troubleshooting

- **`MongoServerError` / connection refused on startup** — MongoDB isn't running, or `MONGODB_URI` in `backend/.env` is wrong. If you're using a local install, start it (e.g. `mongod` or `brew services start mongodb-community`); for Atlas, double-check the connection string and that your IP is allow-listed.
- **`Error: JWT_SECRET is not defined` / login "works" but every request 401s** — `backend/.env` is missing or wasn't loaded; confirm it exists at `backend/.env` (not the project root) and restart the server.
- **Port 5000 already in use** — change `PORT` in `backend/.env` and restart.
- **"Invalid email or password" right after seeding** — make sure you ran `npm run seed` against the same database `MONGODB_URI` points at.
- **`npm install` fails on a fresh machine** — confirm `node -v` is 18+; delete `node_modules` and `package-lock.json` and try again.
- **Frontend loads but API calls fail with a network error** — you're probably opening the HTML files directly from disk (`file://`) instead of through the server. Always access the app via `http://localhost:5000`.
