function getTaskIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id');
}

let currentTask = null;

async function loadTask() {
  const id = getTaskIdFromUrl();
  if (!id) {
    document.getElementById('task-content').innerHTML = '<p class="error-note">No task specified.</p>';
    return;
  }
  try {
    const data = await api.get(`/tasks/${id}`);
    currentTask = data.task;
    await renderTask();
    loadComments();
  } catch (err) {
    document.getElementById('task-content').innerHTML = `<p class="error-note">Could not load this task: ${escapeHtml(err.message)}</p>`;
  }
}

async function renderTask() {
  const t = currentTask;
  const breadcrumb = document.getElementById('task-breadcrumb');
  breadcrumb.textContent = '\u2190 ' + t.project.name;
  breadcrumb.href = `project.html?id=${t.project._id}`;

  document.getElementById('task-title-input').value = t.title;
  document.getElementById('task-description-input').value = t.description || '';
  document.getElementById('task-status-select').value = t.status;
  document.getElementById('task-priority-select').value = t.priority;
  document.getElementById('task-due-input').value = t.dueDate ? t.dueDate.substring(0, 10) : '';

  try {
    const usersData = await api.get('/users');
    const assigneeSelect = document.getElementById('task-assignee-select');
    assigneeSelect.innerHTML = ['<option value="">Unassigned</option>']
      .concat(usersData.users.map((u) => `<option value="${u._id}" ${t.assignedTo && t.assignedTo._id === u._id ? 'selected' : ''}>${escapeHtml(u.name)}</option>`))
      .join('');
  } catch (err) {
    // leave the assignee dropdown with just "Unassigned" if this fails
  }

  const currentUser = getCurrentUser();
  const isOwner = String(t.project.owner) === String(currentUser.id);
  document.getElementById('delete-task-btn').hidden = !isOwner;
}

async function saveTask(e) {
  e.preventDefault();
  const errorBox = document.getElementById('task-detail-error');
  errorBox.textContent = '';
  try {
    const data = await api.put(`/tasks/${currentTask._id}`, {
      title: document.getElementById('task-title-input').value.trim(),
      description: document.getElementById('task-description-input').value.trim(),
      status: document.getElementById('task-status-select').value,
      priority: document.getElementById('task-priority-select').value,
      assignedTo: document.getElementById('task-assignee-select').value || undefined,
      dueDate: document.getElementById('task-due-input').value || undefined
    });
    currentTask = data.task;
    showToast('Task updated', 'success');
  } catch (err) {
    errorBox.textContent = err.message;
  }
}

async function deleteTask() {
  if (!confirm('Delete this task? This cannot be undone.')) return;
  try {
    const projectId = currentTask.project._id;
    await api.delete(`/tasks/${currentTask._id}`);
    window.location.href = `project.html?id=${projectId}`;
  } catch (err) {
    showToast(err.message);
  }
}

async function loadComments() {
  const list = document.getElementById('comments-list');
  try {
    const data = await api.get(`/tasks/${currentTask._id}/comments`);
    const currentUser = getCurrentUser();
    list.innerHTML = data.comments.length
      ? data.comments.map((c) => `
        <div class="comment" data-comment-id="${c._id}">
          <div class="comment-header">
            <span class="comment-author">${escapeHtml(c.user.name)}</span>
            <span class="comment-time">${timeAgo(c.createdAt)}</span>
            ${c.user._id === currentUser.id ? '<button class="comment-delete" type="button">Delete</button>' : ''}
          </div>
          <p class="comment-content">${escapeHtml(c.content)}</p>
        </div>
      `).join('')
      : '<p class="empty-note">No comments yet — start the conversation.</p>';

    list.querySelectorAll('.comment-delete').forEach((btn) => {
      btn.addEventListener('click', () => deleteComment(btn.closest('.comment').dataset.commentId));
    });
  } catch (err) {
    list.innerHTML = `<p class="error-note">Could not load comments: ${escapeHtml(err.message)}</p>`;
  }
}

async function submitComment(e) {
  e.preventDefault();
  const input = document.getElementById('comment-input');
  const content = input.value.trim();
  if (!content) return;
  try {
    await api.post(`/tasks/${currentTask._id}/comments`, { content });
    input.value = '';
    loadComments();
  } catch (err) {
    showToast(err.message);
  }
}

async function deleteComment(id) {
  if (!confirm('Delete this comment?')) return;
  try {
    await api.delete(`/comments/${id}`);
    loadComments();
  } catch (err) {
    showToast(err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!getCurrentUser()) return;
  document.getElementById('task-detail-form').addEventListener('submit', saveTask);
  document.getElementById('delete-task-btn').addEventListener('click', deleteTask);
  document.getElementById('comment-form').addEventListener('submit', submitComment);
  loadTask();
});
