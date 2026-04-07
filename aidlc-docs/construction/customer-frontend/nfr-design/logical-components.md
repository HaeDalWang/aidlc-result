# Logical Components — customer-frontend

## 개요

customer-frontend의 논리적 컴포넌트 구성입니다.
Vite 빌드 기준 `src/` 디렉토리 내 파일 구조와 각 컴포넌트의 역할, 의존성을 정의합니다.

---

## 컴포넌트 의존성 다이어그램

```
index.html
  |
  +-- main.js (AppController)
        |
        +-- api.js (CustomerAPI)          # HTTP 클라이언트
        +-- auth.js (CustomerAuth)        # -> api.js
        +-- menu.js (MenuView)            # -> api.js, cart.js
        +-- cart.js (CartManager)         # -> Storage 유틸
        +-- order.js (OrderView)          # -> api.js, cart.js
        +-- order-history.js (OrderHistoryView + SSEClient)
                                          # -> api.js
```

---

## 1. AppController (`src/main.js`)

### 역할
- 앱 전역 진입점, AppState 관리, 화면 라우팅
- 각 모듈 초기화 및 이벤트 조율

### 논리 흐름
```
DOMContentLoaded
  |
  +-- CartManager.loadFromStorage()
  +-- CustomerAuth.autoLogin()
        |
        +-- 실패 --> showSetupScreen()
        +-- 성공 --> showMainApp() --> MenuView.init()

탭 클릭 이벤트
  |
  +-- 'menu'   --> MenuView.show()
  +-- 'cart'   --> CartManager.renderCartView()
  +-- 'orders' --> OrderHistoryView.init()
```

### 외부 의존성
- 없음 (다른 모듈의 최상위 조율자)

---

## 2. CustomerAPI (`src/api.js`)

### 역할
- 모든 백엔드 API 호출 집중 관리
- Authorization 헤더 자동 주입
- 오류 표준화 (APIError, NetworkError)

### 인터페이스
```javascript
export async function login(storeId, tableNumber, password)
  // POST /api/auth/table-login
  // returns: { token, tableId, sessionId, storeName }

export async function getMenus()
  // GET /api/menus (Bearer token)
  // returns: MenuItem[]

export async function createOrder(tableId, sessionId, items)
  // POST /api/orders (Bearer token)
  // returns: { orderId }

export async function getOrdersByTable(tableId)
  // GET /api/orders/table/{tableId} (Bearer token)
  // returns: Order[]
```

### NFR 적용
- `try/catch` + `APIError`/`NetworkError` 구분 (NFR-SEC-001)
- 토큰 console.log 금지 (NFR-SEC-002)

---

## 3. CustomerAuth (`src/auth.js`)

### 역할
- 초기 설정 폼 렌더링 및 제출 처리
- 자동 로그인 (localStorage → API)
- 폼 유효성 검증

### 인터페이스
```javascript
export function initSetupForm(onSuccess)
  // 폼 이벤트 바인딩, 제출 시 onSuccess(session) 콜백 호출

export async function autoLogin(onSuccess, onFail)
  // localStorage 확인 → api.login() → 결과에 따라 콜백 실행
```

### NFR 적용
- `type="password"` (NFR-SEC-003)
- 시맨틱 HTML: `<label>`, `<input>`, `<button>` (NFR-A11Y-001)

---

## 4. MenuView (`src/menu.js`)

### 역할
- 메뉴 목록 API 조회 및 카드 렌더링
- 카테고리 탭 + IntersectionObserver 스크롤 연동
- 메뉴 상세 모달 관리
- 카드 수량 배지 업데이트

### 인터페이스
```javascript
export async function initMenuView()
  // 메뉴 조회 → 렌더링 → 이벤트 바인딩

export function syncCartQuantities(cartItems)
  // 장바구니 데이터 → 카드 수량 배지 갱신

export function show()   // 메뉴 화면 표시
export function hide()   // 메뉴 화면 숨김
```

### NFR 적용
- DocumentFragment 배치 삽입 (NFR-PERF-003)
- IntersectionObserver 카테고리 연동 (NFR-PERF-003)
- `textContent` 사용 (NFR-SEC-001)
- 이미지 onerror: 회색 배경 (NFR-UX-002)
- 44x44px 터치 영역 (NFR-UX-001)

---

## 5. CartManager (`src/cart.js`)

### 역할
- 장바구니 상태 관리 (메모리 + localStorage)
- 장바구니 화면 렌더링
- 탭 dot 배지 관리

### 인터페이스
```javascript
export function addItem(menuId, menuName, unitPrice)
export function increaseItem(menuId)
export function decreaseItem(menuId)   // 0이면 제거
export function clearCart()
export function getItems()            // CartItem[] 반환
export function getTotalAmount()      // number 반환
export function loadFromStorage()     // 초기화 시 호출
export function renderCartView()      // 장바구니 화면 렌더링
export function updateTabBadge()      // dot 배지 표시/숨김
```

### NFR 적용
- Storage 래퍼 함수 (안전한 localStorage 접근) (NFR-MAINT-003)
- 총액 `toLocaleString('ko-KR')` 포맷 (NFR-PERF-003)

---

## 6. OrderView (`src/order.js`)

### 역할
- 주문 확인 모달 표시 및 API 호출
- 성공/실패 토스트 알림

### 인터페이스
```javascript
export function showConfirmModal(cartItems, totalAmount, onConfirm)
  // 모달 표시, onConfirm: 확인 버튼 클릭 시 콜백

export async function submitOrder(tableId, sessionId, cartItems)
  // api.createOrder() 호출 → 성공/실패 처리

export function showSuccessToast()
  // "주문이 완료되었습니다!" 토스트 → 5초 후 메뉴 탭 이동
```

### NFR 적용
- 중복 제출 방지: 확인 버튼 disabled (NFR-UX-002)
- NetworkError/APIError 구분 메시지 (NFR-MAINT-003)
- Escape 키 모달 닫기 (NFR-A11Y-003)

---

## 7. OrderHistoryView + SSEClient (`src/order-history.js`)

### 역할
- 주문 내역 API 조회 및 렌더링
- SSEClient: EventSource 연결/재연결/이벤트 처리

### 인터페이스
```javascript
export async function initOrderHistory()
  // 주문 조회 → 렌더링 → SSE 연결

export function updateOrderStatus(orderId, status)
  // 타겟 DOM Progress Bar 업데이트

export function handleSessionCompleted()
  // 주문 내역 + 장바구니 초기화

export function disconnectSSE()
  // SSE 연결 종료 (앱 종료 시)

export function show()
export function hide()
```

### SSEClient 설계
```javascript
class SSEClient {
  MAX_RETRIES = 5
  RETRY_INTERVAL = 3000ms

  connect(url)
  disconnect()
  handleMessage(event)   // order_status_updated, session_completed
  handleError()          // 재연결 로직
}
```

### NFR 적용
- 최대 5회 재연결 (NFR-AVAIL-001)
- 타겟 DOM 업데이트만 (NFR-PERF-003)
- SSE 중복 연결 방지 (BR-HISTORY-005)

---

## 8. Storage 유틸 (`src/cart.js` 내 또는 `src/utils.js`)

### 역할
- localStorage 안전 래퍼 (try/catch)

```javascript
export const Storage = {
  get(key),
  set(key, value),
  remove(key)
}
```

### 저장 키 목록

| localStorage 키 | 데이터 | 관리 주체 |
|---|---|---|
| `tableCredentials` | `{ storeId, tableNumber, password }` | CustomerAuth |
| `authSession` | `{ token, tableId, sessionId, storeName }` | CustomerAuth |
| `cartItems` | `CartItem[]` | CartManager |

---

## 컴포넌트 간 통신 패턴

### 이벤트 기반 통신
```javascript
// CartManager → MenuView (장바구니 변경 시 카드 배지 업데이트)
document.dispatchEvent(new CustomEvent('cart:changed', {
  detail: { items: cartItems }
}))

// OrderHistoryView → AppController (session_completed)
document.dispatchEvent(new CustomEvent('session:completed'))
```

### 직접 호출 (main.js가 조율)
```javascript
// main.js에서 직접 호출
CartManager.loadFromStorage()
await CustomerAuth.autoLogin(onSuccess, onFail)
await MenuView.initMenuView()
```
