const Auth = {
  getToken() { return localStorage.getItem('admin_token'); },

  isTokenValid() {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch { return false; }
  },

  async login(storeIdentifier, username, password) {
    const data = await API.post('/auth/admin-login', {
      store_identifier: storeIdentifier,
      username,
      password,
    });
    if (!data) return;
    localStorage.setItem('admin_token', data.token);
    Dashboard.init();
  },

  logout(message = null) {
    localStorage.removeItem('admin_token');
    SSEClient.disconnect();
    if (message) showToast(message, 'info');
    showScreen('login');
  },
};

// 로그인 폼 이벤트
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  const store = document.getElementById('login-store').value.trim();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = '로그인 중...';

  try {
    await Auth.login(store, username, password);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = '로그인';
  }
});

document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());

function showScreen(name) {
  document.getElementById('login-screen').classList.toggle('hidden', name !== 'login');
  document.getElementById('dashboard-screen').classList.toggle('hidden', name !== 'dashboard');
}

function showToast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function showConfirm(message) {
  return new Promise((resolve) => {
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-modal').classList.remove('hidden');
    const ok = document.getElementById('confirm-ok-btn');
    const cancel = document.getElementById('confirm-cancel-btn');
    const cleanup = (result) => {
      document.getElementById('confirm-modal').classList.add('hidden');
      ok.replaceWith(ok.cloneNode(true));
      cancel.replaceWith(cancel.cloneNode(true));
      resolve(result);
    };
    document.getElementById('confirm-ok-btn').addEventListener('click', () => cleanup(true), { once: true });
    document.getElementById('confirm-cancel-btn').addEventListener('click', () => cleanup(false), { once: true });
  });
}
