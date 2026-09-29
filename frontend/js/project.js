function getProjectIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id');
}

let currentProject = null;
let currentTasks = [];
const STATUS_COLUMNS = ['To Do', 'In Progress', 'Review', 'Completed'];

async function loadProject() {
  const id = getProjectIdFromUrl();
  if (!id) {
    document.getElementById('project-content').innerHTML = '<p class="error-note">No project specified.</p>';
    return;
  }
  try {
    const [projectData, tasksData] = await Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/tasks?project=${id}`)
    ]);
    currentProject = projectData.project;
    currentTasks = tasksData.tasks;
    renderProjectHeader();
    renderBoard();
  } catch (err) {
    document.getElementById('project-content').innerHTML = `<p class="error-note">Could not load this project: ${escapeHtml(err.message)}</p>`;
  }
}

function renderProjectHeader() {
  const p = currentProject;
  const currentUser = getCurrentUser();
  const isOwner = p.owner._id === currentUser.id;
  const statusSlug = p.status.toLowerCase().replace(/\s+/g, '-');

  document.getElementById('project-title').textContent = p.name;
  document.getElementById('project-description').textContent = p.description || 'No description yet.';
  const badge = document.getElementById('project-status-badge');
  badge.textContent = p.status;
  badge.className = `badge badge-status-${statusSlug}`;
  document.getElementById('project-owner').textContent = p.owner.name;
  document.getElementById('project-dates').textContent =
    `${p.startDate ? formatDate(p.startDate) : 'No start date'} – ${p.dueDate ? formatDate(p.dueDate) : 'no due date'}`;
  document.getElementById('project-members').innerHTML = p.members.length
    ? p.members.map((m) => `<span class="member-chip">${escapeHtml(m.name)}</span>`).join('')
    : '<span class="empty-note">No members added</span>';

  document.getElementById('owner-actions').hidden = !isOwner;
  document.getElementById('add-task-btn').hidden = false;
}

function renderBoard() {
  const board = document.getElementById('board');
  board.innerHTML = STATUS_COLUMNS.map((status) => {
    const tasksInColumn = currentTasks.filter((t) => t.status === status);
    return `
      <div class="board-column">
        <div class="board-column-header">
          <span>${status}</span>
          <span class="column-count">${tasksInColumn.length}</span>
        </div>
        <div class="board-column-body">
          ${tasksInColumn.length ? tasksInColumn.map(renderTaskCard).join('') : '<p class="empty-note">No tasks</p>'}
        </div>
      </div>
    `;
  }).join('');

  board.querySelectorAll('[data-status-select]').forEach((select) => {
    select.addEventListener('click', (e) => e.stopPropagation());
    select.addEventListener('change', (e) => updateTaskStatus(select.dataset.statusSelect, e.target.value));
  });
  board.querySelectorAll('.task-card').forEach((card) => {
    card.addEventListener('click', () => {
      window.location.href = `task.html?id=${card.dataset.taskId}`;
    });
  });
}

function renderTaskCard(task) {
  return `
    <div class="task-card" data-task-id="${task._id}">
      <div class="task-card-top">
        <span class="badge badge-priority-${task.priority.toLowerCase()}">${task.priority}</span>
      </div>
      <p class="task-card-title">${escapeHtml(task.title)}</p>
      <div class="task-card-bottom">
        <span class="task-card-assignee">${task.assignedTo ? escapeHtml(task.assignedTo.name) : 'Unassigned'}</span>
        <span class="task-card-due">${task.dueDate ? formatDate(task.dueDate) : ''}</span>
      </div>
      <select class="task-card-status-select" data-status-select="${task._id}" aria-label="Change status">
        ${STATUS_COLUMNS.map((s) => `<option value="${s}" ${s === task.status ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>
  `;
}

async function updateTaskStatus(taskId, newStatus) {
  try {
    await api.put(`/tasks/${taskId}`, { status: newStatus });
    await loadProject();
    showToast('Task moved to ' + newStatus, 'success');
  } catch (err) {
    showToast(err.message);
  }
}

function openTaskModal() {
  const assigneeSelect = document.getElementById('task-assignee');
  const candidates = [currentProject.owner, ...currentProject.members];
  assigneeSelect.innerHTML = ['<option value="">Unassigned</option>']
    .concat(candidates.map((u) => `<option value="${u._id}">${escapeHtml(u.name)}</option>`))
    .join('');

  document.getElementById('task-title').value = '';
  document.getElementById('task-description').value = '';
  document.getElementById('task-priority').value = 'Medium';
  document.getElementById('task-due').value = '';
  document.getElementById('task-modal-error').textContent = '';
  document.getElementById('task-modal').hidden = false;
}

function closeTaskModal() {
  document.getElementById('task-modal').hidden = true;
}

async function submitTaskForm(e) {
  e.preventDefault();
  const errorBox = document.getElementById('task-modal-error');
  const title = document.getElementById('task-title').value.trim();
  if (!title) {
    errorBox.textContent = 'Task title is required';
    return;
  }
  try {
    await api.post('/tasks', {
      title,
      description: document.getElementById('task-description').value.trim(),
      project: currentProject._id,
      assignedTo: document.getElementById('task-assignee').value || undefined,
      priority: document.getElementById('task-priority').value,
      dueDate: document.getElementById('task-due').value || undefined
    });
    closeTaskModal();
    loadProject();
    showToast('Task created', 'success');
  } catch (err) {
    errorBox.textContent = err.message;
  }
}

async function deleteCurrentProject() {
  if (!confirm('Delete this project? This also deletes all of its tasks and comments.')) return;
  try {
    await api.delete(`/projects/${currentProject._id}`);
    window.location.href = 'projects.html';
  } catch (err) {
    showToast(err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!getCurrentUser()) return;
  document.getElementById('add-task-btn').addEventListener('click', openTaskModal);
  document.getElementById('task-form').addEventListener('submit', submitTaskForm);
  document.getElementById('task-modal-close').addEventListener('click', closeTaskModal);
  document.getElementById('task-modal-cancel').addEventListener('click', closeTaskModal);
  document.getElementById('delete-project-btn').addEventListener('click', deleteCurrentProject);
  loadProject();
});
