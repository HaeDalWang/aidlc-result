# NFR Design Patterns — admin-frontend

## Pattern 1: SSE 재연결 (지수 백오프)

```javascript
class SSEClient {
  constructor() {
    this.es = null;
    this.retryCount = 0;
    this.maxRetry = 5;
    this.handlers = {};
  }

  connect(token) {
    this.es = new EventSource(`/api/sse/admin?token=${token}`);
    this.es.onmessage = (e) => {
      const event = JSON.parse(e.data);
      this.handlers[event.type]?.(event);
    };
    this.es.onerror = () => this._scheduleReconnect();
    this.es.onopen = () => { this.retryCount = 0; updateSSEStatus(true); };
  }

  _scheduleReconnect() {
    updateSSEStatus(false);
    if (this.retryCount >= this.maxRetry) return showFatalError();
    const delay = Math.min(3000 * Math.pow(2, this.retryCount), 30000);
    this.retryCount++;
    setTimeout(() => this.connect(getToken()), delay);
  }
}
```

> **참고**: EventSource는 Authorization 헤더를 지원하지 않으므로 토큰을 쿼리 파라미터로 전달.  
> 백엔드 SSE 라우터에서 `?token=` 쿼리 파라미터도 허용하도록 수정 필요.

## Pattern 2: 중앙화된 API 모듈

```javascript
// api.js
const BASE = '/api';

async function request(method, path, body = null) {
  const token = localStorage.getItem('admin_token');
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (res.status === 401) { Auth.logout(); return null; }
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
}
```

## Pattern 3: 신규 주문 강조 (CSS + JS 타이머)

```css
.table-card.highlight {
  border-color: #ff6b35;
  animation: pulse 0.5s ease-in-out 3;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.02); }
}
```

```javascript
function highlightCard(tableId) {
  const card = document.querySelector(`[data-testid="table-card-${tableId}"]`);
  card.classList.add('highlight');
  clearTimeout(card._highlightTimer);
  card._highlightTimer = setTimeout(() => card.classList.remove('highlight'), 3000);
}
```

## Pattern 4: 토스트 메시지

```javascript
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
```
