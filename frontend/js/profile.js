function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

async function renderProfile() {
  const cached = getCurrentUser();
  if (!cached) return;

  document.getElementById('profile-name').textContent = cached.name;
  document.getElementById('profile-email').textContent = cached.email;
  document.getElementById('profile-avatar').textContent = initials(cached.name);

  try {
    const data = await api.get('/auth/me');
    document.getElementById('profile-name').textContent = data.user.name;
    document.getElementById('profile-email').textContent = data.user.email;
    document.getElementById('profile-avatar').textContent = initials(data.user.name);
  } catch (err) {
    // keep the cached values if this fails
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!getCurrentUser()) return;
  renderProfile();
});
