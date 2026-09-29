// Renders the shared sidebar + topbar (with notification bell) into every
// protected page's #app-sidebar / #app-topbar placeholders, and wires up
// logout + the mobile menu toggle.
const NAV_ITEMS = [
  { label: 'Dashboard', href: 'dashboard.html', match: ['dashboard.html', 'index.html', ''] },
  { label: 'Projects', href: 'projects.html', match: ['projects.html', 'project.html'] },
  { label: 'My Tasks', href: 'tasks.html', match: ['tasks.html', 'task.html'] },
  { label: 'Profile', href: 'profile.html', match: ['profile.html'] }
];

function renderLayout() {
  requireAuth();
  const user = getCurrentUser();
  if (!user) return;

  const current = window.location.pathname.split('/').pop();
  const sidebarEl = document.getElementById('app-sidebar');
  const topbarEl = document.getElementById('app-topbar');
  if (!sidebarEl || !topbarEl) return;

  sidebarEl.innerHTML = `
    <div class="sidebar-brand">Project Management Tool</div>
    <nav class="sidebar-nav">
      ${NAV_ITEMS.map((item) => `<a href="${item.href}" class="sidebar-link${item.match.includes(current) ? ' active' : ''}">${item.label}</a>`).join('')}
    </nav>
    <button class="sidebar-logout" id="logout-btn" type="button">Log out</button>
  `;

  topbarEl.innerHTML = `
    <button class="menu-toggle" id="menu-toggle" type="button" aria-label="Toggle menu">&#9776;</button>
    <div class="topbar-spacer"></div>
    <div class="notification-wrap">
      <button class="notification-bell" id="notif-bell" type="button" aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
        <span class="notif-badge" id="notif-badge" hidden>0</span>
      </button>
      <div class="notification-dropdown" id="notif-dropdown" hidden>
        <div class="notification-dropdown-header">
          <span>Notifications</span>
          <button id="notif-mark-all" type="button">Mark all read</button>
        </div>
        <div class="notification-list" id="notif-list"><p class="empty-note">Loading…</p></div>
      </div>
    </div>
    <div class="topbar-user">
      <span class="topbar-avatar">${escapeHtml((user.name || '?').trim().charAt(0).toUpperCase())}</span>
      <span class="topbar-user-name">${escapeHtml(user.name)}</span>
    </div>
  `;

  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('menu-toggle').addEventListener('click', () => {
    sidebarEl.classList.toggle('open');
  });

  setupNotifications();
}

async function setupNotifications() {
  const bell = document.getElementById('notif-bell');
  const dropdown = document.getElementById('notif-dropdown');
  const list = document.getElementById('notif-list');
  const badge = document.getElementById('notif-badge');
  const markAllBtn = document.getElementById('notif-mark-all');

  async function loadNotifications() {
    try {
      const data = await api.get('/notifications');
      if (data.unreadCount > 0) {
        badge.hidden = false;
        badge.textContent = data.unreadCount > 9 ? '9+' : String(data.unreadCount);
      } else {
        badge.hidden = true;
      }
      list.innerHTML = data.notifications.length
        ? data.notifications.map((n) => `
          <div class="notification-item${n.read ? '' : ' unread'}">
            <p>${escapeHtml(n.message)}</p>
            <span class="notification-time">${timeAgo(n.createdAt)}</span>
          </div>
        `).join('')
        : '<p class="empty-note">Nothing yet — you\'ll see task and project updates here.</p>';
    } catch (err) {
      list.innerHTML = '<p class="empty-note">Could not load notifications.</p>';
    }
  }

  bell.addEventListener('click', () => {
    dropdown.hidden = !dropdown.hidden;
    if (!dropdown.hidden) loadNotifications();
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.hidden && !dropdown.contains(e.target) && e.target !== bell && !bell.contains(e.target)) {
      dropdown.hidden = true;
    }
  });

  markAllBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await api.put('/notifications/read-all');
      loadNotifications();
    } catch (err) {
      showToast(err.message);
    }
  });

  loadNotifications();
}

document.addEventListener('DOMContentLoaded', renderLayout);
