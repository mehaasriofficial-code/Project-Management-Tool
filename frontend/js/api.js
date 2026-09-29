// Thin fetch wrapper: attaches the stored JWT, parses JSON, and turns
// non-2xx responses into thrown Errors with the server's message.
const API_BASE = '/api';

async function apiRequest(method, path, body) {
  const token = localStorage.getItem('pmt_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (networkErr) {
    throw new Error('Network error — check your connection and that the server is running.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch (parseErr) {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('pmt_token');
      localStorage.removeItem('pmt_user');
      const onAuthPage = window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('register.html');
      if (!onAuthPage) window.location.href = 'login.html';
    }
    throw new Error((data && data.message) || `Request failed with status ${response.status}`);
  }

  return data;
}

const api = {
  get: (path) => apiRequest('GET', path),
  post: (path, body) => apiRequest('POST', path, body),
  put: (path, body) => apiRequest('PUT', path, body),
  delete: (path) => apiRequest('DELETE', path)
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

function showToast(message, type = 'error') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
