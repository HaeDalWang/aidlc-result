# Frontend Components — customer-frontend

## 컴포넌트 계층 구조

```
index.html
  |
  +-- AppController (main.js)               # 앱 진입점, 화면 라우팅
  |     |
  |     +-- [초기 설정 화면]
  |     |     CustomerAuth.showSetupScreen()
  |     |
  |     +-- [메인 앱]
  |           |
  |           +-- Header                    # 매장명 / 테이블번호 / 설정버튼
  |           |
  |           +-- TabNavigator              # 하단 탭 (메뉴|장바구니|주문내역)
  |           |
  |           +-- ContentArea
  |                 |
  |                 +-- MenuView (menu.js)
  |                 |     +-- CategoryTabs
  |                 |     +-- MenuGrid
  |                 |           +-- MenuCard (반복)
  |                 |                 +-- MenuDetailModal (동적)
  |                 |
  |                 +-- CartView (cart.js)
  |                 |     +-- CartItemList
  |                 |     |     +-- CartItemRow (반복)
  |                 |     +-- CartSummary
  |                 |     +-- OrderConfirmModal (동적)
  |                 |
  |                 +-- OrderHistoryView (order-history.js)
  |                       +-- OrderList
  |                             +-- OrderCard (반복)
  |                                   +-- StatusProgressBar
```

---

## 1. AppController (`static/customer/js/main.js`)

### 역할
- 앱 진입점, 전역 상태 관리, 화면 전환
- 자동 로그인 처리

### 상태
```javascript
state = {
  isAuthenticated: false,
  currentTab: 'menu',
  menus: [],
  cartItems: [],         // CartManager와 동기화
  orders: [],
  sseConnected: false,
  sseReconnectCount: 0
}
```

### 주요 메서드
| 메서드 | 설명 |
|---|---|
| `init()` | 앱 초기화, localStorage 확인, 자동 로그인 시도 |
| `showSetupScreen()` | 초기 설정 화면 표시, 메인 앱 숨김 |
| `showMainApp()` | 메인 앱 표시, 초기 설정 화면 숨김 |
| `switchTab(tabName)` | 탭 전환, 콘텐츠 영역 교체 |
| `onLoginSuccess(session)` | 로그인 성공 처리, 세션 저장, 메인 앱 진입 |
| `onSessionCompleted()` | session_completed 처리, 주문/장바구니 초기화 |

### 사용자 인터랙션
- 하단 탭 클릭 → `switchTab()` 호출
- 설정 버튼 클릭 → localStorage 삭제 → `showSetupScreen()`

---

## 2. CustomerAuth (`static/customer/js/auth.js`)

### 역할
- 초기 설정 화면 렌더링 및 폼 처리
- 자동 로그인 API 호출

### DOM 구조
```html
<div id="setup-screen">
  <h1>테이블 초기 설정</h1>
  <form id="setup-form">
    <input id="store-id" type="text" placeholder="매장 식별자" required>
    <input id="table-number" type="number" placeholder="테이블 번호" required>
    <input id="table-password" type="password" placeholder="비밀번호" required>
    <button type="submit" id="setup-btn" disabled>설정 완료</button>
  </form>
  <div id="setup-error" class="error-message hidden"></div>
</div>
```

### 주요 메서드
| 메서드 | 설명 |
|---|---|
| `init()` | 폼 이벤트 바인딩 |
| `autoLogin()` | localStorage 확인 후 API 호출 |
| `submitSetup(event)` | 폼 제출 처리, 유효성 검증 |
| `callLoginAPI(storeId, tableNumber, password)` | POST /api/auth/table-login |
| `showError(message)` | 에러 메시지 표시 |

### API 연동
- `POST /api/auth/table-login` → `{ token, tableId, sessionId, storeName }`

---

## 3. MenuView (`static/customer/js/menu.js`)

### 역할
- 메뉴 목록 API 조회 및 렌더링
- 카테고리 탭 + 스크롤 연동 (Q2-A)
- 메뉴 상세 모달 (Q3-A)
- 메뉴 카드 +/- 버튼 (Q4-A)

### DOM 구조
```html
<div id="menu-view">
  <div id="category-tabs">
    <!-- 카테고리 탭 반복 -->
    <button class="category-tab active" data-category="한식">한식</button>
  </div>
  <div id="menu-grid">
    <!-- 카테고리 섹션 반복 -->
    <section class="category-section" data-category="한식">
      <h2 class="category-title">한식</h2>
      <!-- 메뉴 카드 반복 -->
      <div class="menu-card" data-menu-id="1">
        <img class="menu-image" src="..." onerror="handleImageError(this)">
        <div class="menu-info">
          <span class="menu-name">메뉴명</span>
          <span class="menu-price">10,000원</span>
        </div>
        <div class="menu-quantity-control">
          <button class="qty-decrease">-</button>
          <span class="qty-display hidden">0</span>
          <button class="qty-increase">+</button>
        </div>
      </div>
    </section>
  </div>
</div>

<!-- 메뉴 상세 모달 -->
<div id="menu-detail-modal" class="modal hidden">
  <div class="modal-overlay"></div>
  <div class="modal-content">
    <button class="modal-close">X</button>
    <img id="modal-menu-image">
    <h2 id="modal-menu-name"></h2>
    <p id="modal-menu-price"></p>
    <p id="modal-menu-description"></p>
    <div class="modal-quantity-control">
      <button id="modal-qty-decrease">-</button>
      <span id="modal-qty-display">0</span>
      <button id="modal-qty-increase">+</button>
    </div>
    <button id="modal-add-to-cart">장바구니 담기</button>
  </div>
</div>
```

### 주요 메서드
| 메서드 | 설명 |
|---|---|
| `init()` | 메뉴 API 조회, 렌더링, 이벤트 바인딩 |
| `loadMenus()` | GET /api/menus 호출 후 렌더링 |
| `renderCategoryTabs(categories)` | 탭 생성 |
| `renderMenuGrid(menus)` | 카테고리 섹션 + 카드 생성 |
| `scrollToCategory(categoryName)` | scrollIntoView 호출 |
| `openDetailModal(menuId)` | 모달 표시, 현재 장바구니 수량 반영 |
| `closeDetailModal()` | 모달 숨김 |
| `handleImageError(img)` | 이미지 숨김 + 회색 배경 (Q11-C) |
| `updateCardQuantityBadge(menuId, qty)` | 카드 수량 배지 업데이트 |
| `syncQuantityFromCart()` | 장바구니 수량을 카드에 반영 |

### 카테고리 탭 스크롤 연동
- `IntersectionObserver`로 뷰포트 진입 섹션 감지 → 활성 탭 업데이트
- 탭 클릭 시 `scrollIntoView({ behavior: 'smooth', block: 'start' })`

### API 연동
- `GET /api/menus` → `MenuItem[]`

---

## 4. CartManager (`static/customer/js/cart.js`)

### 역할
- 장바구니 상태 관리 (메모리 + localStorage 동기화)
- 장바구니 화면 렌더링

### DOM 구조 (장바구니 화면)
```html
<div id="cart-view">
  <div id="cart-item-list">
    <!-- CartItemRow 반복 -->
    <div class="cart-item-row" data-menu-id="1">
      <span class="item-name">메뉴명</span>
      <div class="item-quantity-control">
        <button class="cart-qty-decrease">-</button>
        <span class="cart-qty">1</span>
        <button class="cart-qty-increase">+</button>
      </div>
      <span class="item-subtotal">10,000원</span>
    </div>
  </div>
  <div id="cart-empty-message" class="hidden">장바구니가 비어있습니다.</div>
  <div id="cart-summary">
    <span>총 금액</span>
    <span id="cart-total">0원</span>
  </div>
  <button id="clear-cart-btn">장바구니 비우기</button>
  <button id="order-btn" disabled>주문하기</button>
</div>
```

### 주요 메서드
| 메서드 | 설명 |
|---|---|
| `addItem(menuId, menuName, unitPrice)` | 항목 추가 또는 수량 증가 |
| `increaseItem(menuId)` | 수량 +1 |
| `decreaseItem(menuId)` | 수량 -1, 0이면 제거 |
| `removeItem(menuId)` | 항목 제거 |
| `clearCart()` | 전체 초기화 |
| `getItems()` | 현재 CartItem[] 반환 |
| `getTotalAmount()` | 총액 계산 |
| `getItemCount()` | 총 아이템 수 |
| `saveToStorage()` | localStorage 동기화 |
| `loadFromStorage()` | localStorage 복원 |
| `renderCartView()` | 장바구니 화면 전체 렌더링 |
| `updateCartTabBadge()` | 하단 탭 dot 배지 업데이트 |

### 이벤트 (외부 발행)
- `cart:changed` — 장바구니 변경 시 MenuView 카드 수량 업데이트 트리거

---

## 5. OrderView (`static/customer/js/order.js`)

### 역할
- 주문 확인 모달 표시 및 주문 API 호출 (Q5-B)
- 성공 토스트 표시 (Q6-A)

### DOM 구조 (주문 확인 모달)
```html
<div id="order-confirm-modal" class="modal hidden">
  <div class="modal-overlay"></div>
  <div class="modal-content">
    <h2>주문 확인</h2>
    <div id="order-confirm-items">
      <!-- 주문 항목 목록 -->
    </div>
    <div id="order-confirm-total">총액: <span>0원</span></div>
    <div class="modal-actions">
      <button id="order-cancel-btn">취소</button>
      <button id="order-confirm-btn">확인</button>
    </div>
  </div>
</div>

<!-- 토스트 메시지 -->
<div id="toast-message" class="toast hidden"></div>
```

### 주요 메서드
| 메서드 | 설명 |
|---|---|
| `showConfirmModal(cartItems, totalAmount)` | 확인 모달 표시 |
| `closeConfirmModal()` | 모달 닫기 |
| `submitOrder()` | POST /api/orders 호출 |
| `showSuccessToast()` | "주문이 완료되었습니다!" 토스트 3초 표시 |
| `showErrorToast(message)` | 에러 토스트 표시 |
| `navigateToMenuAfterDelay()` | 5초 후 메뉴 탭으로 전환 |

### API 연동
- `POST /api/orders` payload:
  ```javascript
  {
    table_id: number,
    session_id: string,
    items: [{ menu_id, quantity, unit_price }]
  }
  ```

---

## 6. OrderHistoryView (`static/customer/js/order-history.js`)

### 역할
- 현재 세션 주문 내역 조회 및 렌더링
- SSE 클라이언트 관리 (연결, 재연결, 이벤트 처리)

### DOM 구조
```html
<div id="order-history-view">
  <div id="sse-status-bar" class="hidden">
    <!-- 연결 끊김 안내 (재연결 실패 시) -->
    실시간 업데이트 연결이 끊겼습니다. 페이지를 새로고침해 주세요.
  </div>
  <div id="order-list">
    <!-- OrderCard 반복 -->
    <div class="order-card" data-order-id="1">
      <div class="order-header">
        <span class="order-number">#1</span>
        <span class="order-time">14:30</span>
      </div>
      <div class="order-items">
        <!-- 메뉴명 × 수량 목록 -->
      </div>
      <div class="order-total">15,000원</div>
      <div class="order-status-bar">
        <div class="status-label">준비중</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 50%"></div>
        </div>
      </div>
    </div>
  </div>
  <div id="order-empty-message" class="hidden">아직 주문 내역이 없습니다.</div>
</div>
```

### 주요 메서드
| 메서드 | 설명 |
|---|---|
| `init()` | 주문 조회 + SSE 연결 시작 |
| `loadOrders()` | GET /api/orders/table/{tableId} 호출 |
| `renderOrders(orders)` | 주문 카드 렌더링 |
| `updateOrderStatus(orderId, status)` | 상태 배지 + Progress Bar 업데이트 |
| `connectSSE()` | SSE 연결 시작 |
| `onSSEMessage(event)` | 이벤트 수신 처리 |
| `reconnectSSE()` | 재연결 로직 (최대 5회, 3초 간격) |
| `handleSessionCompleted()` | 주문 내역 + 장바구니 초기화 |
| `getStatusLabel(status)` | 상태 코드 → 한국어 텍스트 |
| `getStatusProgress(status)` | 상태 코드 → 진행률 (0/50/100) |

### Progress Bar 상태 매핑 (Q7-B)
| 상태 (status) | 표시 텍스트 | 진행률 | 색상 |
|---|---|---|---|
| `pending` | 대기중 | 0% | 빨간색 |
| `preparing` | 준비중 | 50% | 노란색 |
| `completed` | 완료 | 100% | 초록색 |

### SSE 이벤트 처리
```javascript
// order_status_updated
{ order_id: number, status: string }
→ updateOrderStatus(order_id, status)

// session_completed
{}
→ handleSessionCompleted()
```

### API 연동
- `GET /api/orders/table/{tableId}` → `Order[]`
- `GET /api/sse/table/{tableId}` (EventSource)

---

## 7. CustomerAPI (`static/customer/js/api.js`)

### 역할
- 모든 API 호출을 단일 모듈로 집중 관리
- Authorization 헤더 자동 주입
- 에러 응답 표준화

### 주요 메서드
| 메서드 | HTTP | 엔드포인트 |
|---|---|---|
| `login(storeId, tableNumber, password)` | POST | `/api/auth/table-login` |
| `getMenus()` | GET | `/api/menus` |
| `createOrder(tableId, sessionId, items)` | POST | `/api/orders` |
| `getOrdersByTable(tableId)` | GET | `/api/orders/table/{tableId}` |

### 공통 처리
```javascript
// 헤더 구성
headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`   // authSession.token
}

// 에러 구분
if (!navigator.onLine) throw new NetworkError('오프라인')
if (!response.ok) throw new APIError(response.status, message)
```

---

## 8. 공통 UI 유틸리티 (index.html 인라인 또는 main.js)

### Toast
```javascript
showToast(message, duration = 3000)
// 하단 토스트, duration ms 후 자동 숨김
```

### Modal 헬퍼
```javascript
openModal(modalElement)
closeModal(modalElement)
// aria-hidden, overflow 처리 포함
```

### 가격 포맷
```javascript
formatPrice(amount)
// 예: 15000 → "15,000원"
```

---

## 화면 전환 흐름 요약

```
앱 로드
  |
  +-- localStorage 없음 --> [초기 설정 화면]
  |                              | 설정 완료
  |                              v
  +-- localStorage 있음 --> 자동 로그인 시도
                                 | 성공
                                 v
                           [메인 앱]
                           ├── [메뉴 화면]  ← 기본 탭
                           ├── [장바구니 화면]
                           └── [주문 내역 화면]
                                  | SSE 연결
                                  v
                           실시간 상태 업데이트
```
