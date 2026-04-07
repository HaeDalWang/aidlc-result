const API_BASE = '/api';

const API = {
  async request(method, path, body = null) {
    const token = localStorage.getItem('admin_token');
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(API_BASE + path, opts);

    if (res.status === 401) {
      Auth.logout('세션이 만료되었습니다');
      return null;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: '오류가 발생했습니다' }));
      throw new Error(err.detail || '오류가 발생했습니다');
    }
    if (res.status === 204) return null;
    return res.json();
  },

  post:   (path, body) => API.request('POST',   path, body),
  get:    (path)       => API.request('GET',    path),
  patch:  (path, body) => API.request('PATCH',  path, body),
  delete: (path)       => API.request('DELETE', path),
};
