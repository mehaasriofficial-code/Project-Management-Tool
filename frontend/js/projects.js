let allProjects = [];
let allUsers = [];
let editingProjectId = null;

async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  try {
    const data = await api.get('/projects');
    allProjects = data.projects;
    renderProjects();
  } catch (err) {
    grid.innerHTML = `<p class="error-note">Could not load projects: ${escapeHtml(err.message)}</p>`;
  }
}

function renderProjects() {
  const grid = document.getElementById('projects-grid');
  if (!allProjects.length) {
    grid.innerHTML = '<p class="empty-note">No projects yet — click "New project" to create one.</p>';
    return;
  }

  const currentUser = getCurrentUser();
  grid.innerHTML = allProjects.map((p) => {
    const isOwner = p.owner._id === currentUser.id;
    return `
      <div class="card project-card">
        <div class="card-header">
          <h3><a href="project.html?id=${p._id}">${escapeHtml(p.name)}</a></h3>
          <span class="badge badge-status-${p.status.toLowerCase().replace(/\s+/g, '-')}">${p.status}</span>
        </div>
        <p class="card-desc">${escapeHtml(p.description || 'No description yet.')}</p>
        <div class="card-meta">
          <span>Owner: ${escapeHtml(p.owner.name)}</span>
          <span>${p.members.length} member${p.members.length === 1 ? '' : 's'}</span>
        </div>
        <div class="card-meta">
          <span>Due: ${p.dueDate ? formatDate(p.dueDate) : 'No due date'}</span>
        </div>
        <div class="card-actions">
          <a class="btn btn-secondary btn-sm" href="project.html?id=${p._id}">Open board</a>
          ${isOwner ? `
            <button class="btn btn-secondary btn-sm" data-edit="${p._id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-delete="${p._id}">Delete</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openProjectModal(btn.dataset.edit));
  });
  grid.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteProject(btn.dataset.delete));
  });
}

async function loadUsersForMembers() {
  try {
    const data = await api.get('/users');
    allUsers = data.users;
  } catch (err) {
    allUsers = [];
  }
}

function openProjectModal(projectId) {
  editingProjectId = projectId || null;
  const project = projectId ? allProjects.find((p) => p._id === projectId) : null;

  document.getElementById('modal-title').textContent = project ? 'Edit project' : 'New project';
  document.getElementById('project-name').value = project ? project.name : '';
  document.getElementById('project-description').value = project ? project.description || '' : '';
  document.getElementById('project-status').value = project ? project.status : 'Planning';
  document.getElementById('project-start').value = project && project.startDate ? project.startDate.substring(0, 10) : '';
  document.getElementById('project-due').value = project && project.dueDate ? project.dueDate.substring(0, 10) : '';

  const memberIds = project ? project.members.map((m) => m._id) : [];
  const currentUser = getCurrentUser();
  const otherUsers = allUsers.filter((u) => u._id !== currentUser.id);
  const membersList = document.getElementById('members-checklist');
  membersList.innerHTML = otherUsers.length
    ? otherUsers.map((u) => `
      <label class="checkbox-row">
        <input type="checkbox" value="${u._id}" ${memberIds.includes(u._id) ? 'checked' : ''}>
        ${escapeHtml(u.name)} <span class="checkbox-row-email">${escapeHtml(u.email)}</span>
      </label>
    `).join('')
    : '<p class="empty-note">No other registered users to add yet.</p>';

  document.getElementById('project-modal-error').textContent = '';
  document.getElementById('project-modal').hidden = false;
}

function closeProjectModal() {
  document.getElementById('project-modal').hidden = true;
  editingProjectId = null;
}

async function submitProjectForm(e) {
  e.preventDefault();
  const errorBox = document.getElementById('project-modal-error');
  errorBox.textContent = '';

  const name = document.getElementById('project-name').value.trim();
  if (!name) {
    errorBox.textContent = 'Project name is required';
    return;
  }

  const payload = {
    name,
    description: document.getElementById('project-description').value.trim(),
    status: document.getElementById('project-status').value,
    startDate: document.getElementById('project-start').value || undefined,
    dueDate: document.getElementById('project-due').value || undefined,
    members: Array.from(document.querySelectorAll('#members-checklist input:checked')).map((cb) => cb.value)
  };

  try {
    if (editingProjectId) {
      await api.put(`/projects/${editingProjectId}`, payload);
      showToast('Project updated', 'success');
    } else {
      await api.post('/projects', payload);
      showToast('Project created', 'success');
    }
    closeProjectModal();
    loadProjects();
  } catch (err) {
    errorBox.textContent = err.message;
  }
}

async function deleteProject(id) {
  if (!confirm('Delete this project? This also deletes all of its tasks and comments.')) return;
  try {
    await api.delete(`/projects/${id}`);
    loadProjects();
  } catch (err) {
    showToast(err.message);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!getCurrentUser()) return;
  document.getElementById('new-project-btn').addEventListener('click', () => openProjectModal(null));
  document.getElementById('project-form').addEventListener('submit', submitProjectForm);
  document.getElementById('modal-close').addEventListener('click', closeProjectModal);
  document.getElementById('modal-cancel').addEventListener('click', closeProjectModal);
  await loadUsersForMembers();
  loadProjects();
});
