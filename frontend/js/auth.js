// Session helpers (shared by every page) plus the login/register form handlers.
function getCurrentUser() {
  const raw = localStorage.getItem('pmt_user');
  return raw ? JSON.parse(raw) : null;
}

function requireAuth() {
  if (!localStorage.getItem('pmt_token')) {
    window.location.href = 'login.html';
  }
}

function redirectIfAuthed() {
  if (localStorage.getItem('pmt_token')) {
    window.location.href = 'dashboard.html';
  }
}

function saveSession(token, user) {
  localStorage.setItem('pmt_token', token);
  localStorage.setItem('pmt_user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('pmt_token');
  localStorage.removeItem('pmt_user');
  window.location.href = 'login.html';
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
  redirectIfAuthed();
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById('form-error');
    errorBox.textContent = '';
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';
    try {
      const data = await api.post('/auth/login', {
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
      });
      saveSession(data.token, data.user);
      window.location.href = 'dashboard.html';
    } catch (err) {
      errorBox.textContent = err.message;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log in';
    }
  });
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
  redirectIfAuthed();
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById('form-error');
    errorBox.textContent = '';

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    if (password !== confirmPassword) {
      errorBox.textContent = 'Passwords do not match';
      return;
    }
    if (password.length < 6) {
      errorBox.textContent = 'Password must be at least 6 characters';
      return;
    }

    const submitBtn = registerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    try {
      const data = await api.post('/auth/register', {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        password
      });
      saveSession(data.token, data.user);
      window.location.href = 'dashboard.html';
    } catch (err) {
      errorBox.textContent = err.message;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
    }
  });
}
