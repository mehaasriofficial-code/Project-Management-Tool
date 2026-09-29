async function loadDashboard() {
  const statsEl = document.getElementById('stats-grid');
  const recentProjectsEl = document.getElementById('recent-projects');
  const recentTasksEl = document.getElementById('recent-tasks');

  try {
    const [projectsData, tasksData] = await Promise.all([api.get('/projects'), api.get('/tasks')]);
    const projects = projectsData.projects;
    const tasks = tasksData.tasks;

    const stats = [
      { label: 'Total projects', value: projects.length },
      { label: 'Active projects', value: projects.filter((p) => p.status === 'Active').length },
      { label: 'Completed projects', value: projects.filter((p) => p.status === 'Completed').length },
      { label: 'Total tasks', value: tasks.length },
      { label: 'Pending tasks', value: tasks.filter((t) => t.status !== 'Completed').length },
      { label: 'Completed tasks', value: tasks.filter((t) => t.status === 'Completed').length }
    ];

    statsEl.innerHTML = stats.map((s) => `
      <div class="stat-card">
        <span class="stat-value">${s.value}</span>
        <span class="stat-label">${s.label}</span>
      </div>
    `).join('');

    const recentProjects = [...projects].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    recentProjectsEl.innerHTML = recentProjects.length
      ? recentProjects.map((p) => `
        <a class="list-row" href="project.html?id=${p._id}">
          <span class="list-row-title">${escapeHtml(p.name)}</span>
          <span class="badge badge-status-${p.status.toLowerCase().replace(/\s+/g, '-')}">${p.status}</span>
        </a>
      `).join('')
      : '<p class="empty-note">No projects yet — <a href="projects.html">create your first one</a>.</p>';

    const recentTasks = [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    recentTasksEl.innerHTML = recentTasks.length
      ? recentTasks.map((t) => `
        <a class="list-row" href="task.html?id=${t._id}">
          <span class="list-row-title">${escapeHtml(t.title)}</span>
          <span class="badge badge-priority-${t.priority.toLowerCase()}">${t.priority}</span>
        </a>
      `).join('')
      : '<p class="empty-note">No tasks yet.</p>';
  } catch (err) {
    statsEl.innerHTML = `<p class="error-note">Could not load dashboard data: ${escapeHtml(err.message)}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!getCurrentUser()) return;
  loadDashboard();
});
