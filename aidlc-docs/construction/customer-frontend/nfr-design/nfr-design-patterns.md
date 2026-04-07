# NFR Design Patterns — customer-frontend

## 1. 상태 관리 패턴 (State Management)

### 패턴: 중앙 집중 AppState + 모듈 이벤트

**구조**:
```javascript
// main.js — 단일 AppState 객체
const AppState = {
  isAuthenticated: false,
  currentTab: 'menu',
  menus: [],
  cartItems: [],
  orders: [],
  sseConnected: false,
  sseReconnectCount: 0
}

// 상태 변경 시 커스텀 이벤트로 구독 모듈에 알림
function setState(patch) {
  Object.assign(AppState, patch)
  document.dispatchEvent(new CustomEvent('appstate:changed', { detail: patch }))
}
```

**적용 이유**:
- Vanilla JS에서 전역 상태를 단일 소스로 관리
- 모듈 간 직접 참조 없이 이벤트 기반 통신
- 디버깅 용이 (AppState 객체 콘솔 확인 가능)

---

## 2. 모듈 패턴 (ES6 Module)

**구조**: Vite 기반 ES6 import/export

```javascript
// api.js — Named export
export async function login(storeId, tableNumber, password) { ... }
export async function getMenus() { ... }

// main.js — Import
import { login, getMenus } from './api.js'
```

**파일별 단일 책임**:
| 파일 | 책임 |
|---|---|
| `main.js` | AppState, 화면 라우팅, 초기화 |
| `auth.js` | 인증 UI, 로그인 로직 |
| `menu.js` | 메뉴 렌더링, 카테고리 탭, 모달 |
| `cart.js` | 장바구니 상태, localStorage, 렌더링 |
| `order.js` | 주문 확인 모달, 주문 제출 |
| `order-history.js` | 주문 내역 렌더링, SSE 클라이언트 |
| `api.js` | HTTP 클라이언트, 공통 헤더/오류 처리 |

---

## 3. 오류 처리 패턴 (Error Handling)

### 패턴: API 오류 표준화 + 토스트 알림

```javascript
// api.js — 오류 표준화
class APIError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
    this.type = 'api'
  }
}

class NetworkError extends Error {
  constructor() {
    super('네트워크 연결을 확인해 주세요.')
    this.type = 'network'
  }
}

// 호출부 처리
try {
  await createOrder(...)
} catch (err) {
  if (err.type === 'network') showToast(err.message, 'error')
  else showToast('주문 처리 중 오류가 발생했습니다.', 'error')
}
```

### 토스트 알림 패턴
```javascript
// main.js — 전역 토스트 함수
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.getElementById('toast')
  toast.textContent = message
  toast.className = `toast toast--${type} toast--visible`
  setTimeout(() => toast.classList.remove('toast--visible'), duration)
}
```

---

## 4. 성능 패턴 (Performance)

### 패턴 1: DOM 배치 삽입 (DocumentFragment)

메뉴 카드 / 주문 카드처럼 다수 DOM 요소 생성 시 Fragment로 배치 삽입:

```javascript
function renderMenuCards(menus) {
  const fragment = document.createDocumentFragment()
  menus.forEach(menu => {
    const card = createMenuCard(menu)
    fragment.appendChild(card)
  })
  menuGrid.appendChild(fragment)  // 단 1회 DOM 업데이트
}
```

### 패턴 2: SSE 상태 업데이트 — 타겟 DOM만 변경

전체 목록 재렌더링 없이 해당 주문 카드 Progress Bar만 업데이트:

```javascript
function updateOrderStatus(orderId, status) {
  const card = document.querySelector(`[data-order-id="${orderId}"]`)
  if (!card) return
  const bar = card.querySelector('.progress-fill')
  const label = card.querySelector('.status-label')
  bar.style.width = getStatusProgress(status)
  label.textContent = getStatusLabel(status)
  label.className = `status-label status-label--${status}`
}
```

### 패턴 3: IntersectionObserver — 카테고리 탭 연동

스크롤 이벤트 대신 IntersectionObserver로 성능 최적화:

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      setActiveTab(entry.target.dataset.category)
    }
  })
}, { threshold: 0.3 })

document.querySelectorAll('.category-section').forEach(el => observer.observe(el))
```

---

## 5. SSE 복원력 패턴 (Resilience)

### 패턴: 재시도 제한 + 백오프 없는 고정 간격

```javascript
class SSEClient {
  constructor(url, handlers) {
    this.url = url
    this.handlers = handlers
    this.reconnectCount = 0
    this.MAX_RETRIES = 5
    this.RETRY_INTERVAL = 3000
    this.source = null
  }

  connect() {
    this.source = new EventSource(this.url)
    this.source.onmessage = (e) => this.handleMessage(e)
    this.source.onerror = () => this.handleError()
  }

  handleError() {
    this.source.close()
    if (this.reconnectCount < this.MAX_RETRIES) {
      this.reconnectCount++
      setTimeout(() => this.connect(), this.RETRY_INTERVAL)
    } else {
      this.handlers.onMaxRetriesReached()
    }
  }

  disconnect() {
    if (this.source) this.source.close()
  }
}
```

---

## 6. XSS 방지 패턴 (Security)

### 패턴: textContent 우선, innerHTML 금지

```javascript
// 올바른 방법
const span = document.createElement('span')
span.textContent = menu.name  // XSS 안전

// 금지
element.innerHTML = menu.name  // XSS 위험
```

**예외**: 구조화된 HTML 생성 시 template literal + createElement 조합:
```javascript
function createMenuCard(menu) {
  const card = document.createElement('div')
  card.className = 'menu-card'
  card.dataset.menuId = menu.id

  const name = document.createElement('span')
  name.className = 'menu-name'
  name.textContent = menu.name  // textContent 사용

  card.appendChild(name)
  return card
}
```

---

## 7. localStorage 접근 패턴 (Storage)

### 패턴: 안전한 래퍼 함수

```javascript
// cart.js
const Storage = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key))
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.warn('localStorage 저장 실패:', e)
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key)
    } catch { /* ignore */ }
  }
}
```

**이유**: Private/시크릿 모드에서 localStorage 접근 실패 시 앱 크래시 방지

---

## 8. CDN 로딩 패턴

### 로딩 순서 (index.html)
```html
<head>
  <!-- 1. Tailwind CSS (스타일 먼저) -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- 2. Font Awesome (아이콘) -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/.../font-awesome/6.5.0/css/all.min.css">
</head>
<body>
  <!-- 앱 콘텐츠 -->

  <!-- 3. dayjs (DOM 준비 후) -->
  <script src="https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js"></script>
  <!-- 4. Vite 빌드 번들 -->
  <script type="module" src="/assets/main.js"></script>
</body>
```
