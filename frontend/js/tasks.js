// "My Tasks" page — every task assigned to the logged-in user, across all their projects.
async function loadMyTasks() {
  const container = document.getElementById('my-tasks-list');
  try {
    const data = await api.get('/tasks?assignedToMe=true');
    const tasks = data.tasks;

    if (!tasks.length) {
      container.innerHTML = '<p class="empty-note">Nothing assigned to you yet.</p>';
      return;
    }

    const sorted = [...tasks].sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (b.status === 'Completed' && a.status !== 'Completed') return -1;
      return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
    });

    container.innerHTML = sorted.map((t) => `
      <a class="task-row" href="task.html?id=${t._id}">
        <div class="task-row-main">
          <span class="task-row-title">${escapeHtml(t.title)}</span>
          <span class="task-row-project">${t.project ? escapeHtml(t.project.name) : ''}</span>
        </div>
        <div class="task-row-meta">
          <span class="badge badge-priority-${t.priority.toLowerCase()}">${t.priority}</span>
          <span class="badge badge-taskstatus-${t.status.toLowerCase().replace(/\s+/g, '-')}">${t.status}</span>
          <span class="task-row-due">${t.dueDate ? formatDate(t.dueDate) : 'No due date'}</span>
        </div>
      </a>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p class="error-note">Could not load your tasks: ${escapeHtml(err.message)}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!getCurrentUser()) return;
  loadMyTasks();
});
