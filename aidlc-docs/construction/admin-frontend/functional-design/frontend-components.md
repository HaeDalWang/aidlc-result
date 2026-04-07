# 프론트엔드 컴포넌트 설계 — admin-frontend

## 화면 구조 (SPA)

```
index.html
├── #login-screen          ← 로그인 화면
└── #dashboard-screen      ← 대시보드 (인증 후)
    ├── #header            ← 매장명, SSE 상태, 로그아웃
    ├── #filter-bar        ← 테이블 필터
    ├── #tables-grid       ← 테이블 카드 그리드
    └── [모달 영역]
        ├── #order-detail-modal  ← 주문 상세
        └── #history-modal       ← 과거 내역
```

---

## 컴포넌트 상세

### C-01: LoginScreen
**파일**: `auth.js`  
**담당 스토리**: US-011, US-012

**State**:
```javascript
{ storeIdentifier: '', username: '', password: '', loading: false, error: '' }
```

**렌더링 요소**:
```html
<form data-testid="login-form">
  <input data-testid="login-store-input" />
  <input data-testid="login-username-input" />
  <input data-testid="login-password-input" type="password" />
  <button data-testid="login-submit-button">로그인</button>
  <p data-testid="login-error-message"></p>
</form>
```

**이벤트**:
- submit → BL-02 실행

---

### C-02: Header
**파일**: `dashboard.js` 내 renderHeader()  
**담당 스토리**: US-012

**렌더링 요소**:
```html
<header>
  <span data-testid="header-store-name">매장명</span>
  <span data-testid="sse-status-indicator">●</span>
  <button data-testid="logout-button">로그아웃</button>
</header>
```

**이벤트**:
- logout-button click → localStorage 삭제 → 로그인 화면

---

### C-03: FilterBar
**파일**: `dashboard.js` 내 renderFilterBar()  
**담당 스토리**: US-013

**렌더링 요소**:
```html
<div data-testid="filter-bar">
  <button data-testid="filter-all-button">전체</button>
  <!-- 테이블별 버튼 동적 생성 -->
  <button data-testid="filter-table-{n}-button">{n}번</button>
</div>
```

**이벤트**:
- 테이블 버튼 click → selectedTableId 업데이트 → 그리드 리렌더

---

### C-04: TableCard
**파일**: `dashboard.js` 내 renderTableCard()  
**담당 스토리**: US-013, US-016, US-018

**State**: TableSummary 객체

**렌더링 요소**:
```html
<div data-testid="table-card-{tableId}" class="table-card [highlight]">
  <h3 data-testid="table-card-number-{tableId}">{n}번 테이블</h3>
  <p data-testid="table-card-total-{tableId}">총 {n}원</p>

  <!-- 주문 미리보기 (최신 3개) -->
  <div data-testid="table-card-orders-{tableId}">
    <div data-testid="order-preview-{orderId}" class="order-preview">
      <!-- 주문 번호, 시각, 상태 -->
    </div>
  </div>

  <div class="card-actions">
    <button data-testid="complete-session-button-{tableId}">이용 완료</button>
    <button data-testid="view-history-button-{tableId}">과거 내역</button>
  </div>
</div>
```

**이벤트**:
- order-preview click → OrderDetailModal 열기 (BL-05)
- complete-session-button click → BL-08 실행
- view-history-button click → PastHistoryModal 열기 (BL-09)

---

### C-05: OrderDetailModal
**파일**: `order-detail.js`  
**담당 스토리**: US-014, US-015

**State**: `{ order: Order | null, loading: false }`

**렌더링 요소**:
```html
<div data-testid="order-detail-modal">
  <h2 data-testid="order-detail-title">주문 #{id}</h2>

  <!-- 주문 항목 목록 -->
  <ul data-testid="order-detail-items">
    <li data-testid="order-item-{id}">{menuName} x{qty} {price}원</li>
  </ul>

  <p data-testid="order-detail-total">총 {n}원</p>
  <span data-testid="order-detail-status">{status}</span>

  <!-- 상태 변경 버튼 (조건부) -->
  <button data-testid="order-start-prepare-button">준비 시작</button>
  <button data-testid="order-complete-button">완료 처리</button>

  <button data-testid="order-delete-button">주문 삭제</button>
  <button data-testid="order-detail-close-button">닫기</button>
</div>
```

**이벤트**:
- start-prepare/complete-button click → BL-06
- delete-button click → BL-07 (확인 팝업)
- close-button click → 모달 닫기

**API 연동**:
- `PATCH /api/orders/{id}/status`
- `DELETE /api/orders/{id}`

---

### C-06: PastHistoryModal
**파일**: `past-history.js`  
**담당 스토리**: US-018

**State**: `{ tableId, histories: [], dateFrom: '', dateTo: '', loading: false }`

**렌더링 요소**:
```html
<div data-testid="history-modal">
  <h2 data-testid="history-modal-title">{n}번 테이블 과거 내역</h2>

  <div data-testid="history-date-filter">
    <input data-testid="history-date-from" type="date" />
    <input data-testid="history-date-to" type="date" />
    <button data-testid="history-search-button">조회</button>
  </div>

  <!-- 세션별 그룹 목록 -->
  <div data-testid="history-list">
    <div data-testid="history-session-{sessionId}">
      <p>완료 시각: {completedAt}</p>
      <!-- 주문 목록 -->
    </div>
  </div>

  <button data-testid="history-close-button">닫기</button>
</div>
```

**이벤트**:
- search-button click → BL-09 재조회
- close-button click → 모달 닫기

**API 연동**:
- `GET /api/tables/{id}/history?date_from=&date_to=`

---

### C-07: AdminSSEClient
**파일**: `sse.js`  
**담당 스토리**: US-013

**인터페이스**:
```javascript
SSEClient.connect(token)       // SSE 연결 시작
SSEClient.disconnect()         // 연결 종료
SSEClient.on(type, handler)    // 이벤트 핸들러 등록
SSEClient.reconnect()          // 재연결 (지수 백오프)
```

**이벤트 핸들러 등록**:
```javascript
SSEClient.on('new_order',         Dashboard.handleNewOrder)
SSEClient.on('order_updated',     Dashboard.handleOrderUpdated)
SSEClient.on('order_deleted',     Dashboard.handleOrderDeleted)
SSEClient.on('session_completed', Dashboard.handleSessionCompleted)
```

---

### C-08: AdminAPI
**파일**: `api.js`

**인터페이스**:
```javascript
API.post('/auth/admin-login', body)         // 로그인
API.get('/orders/summary')                  // 대시보드 데이터
API.patch('/orders/{id}/status', body)      // 상태 변경
API.delete('/orders/{id}')                  // 주문 삭제
API.post('/tables/{id}/complete')           // 이용 완료
API.get('/tables/{id}/history', params)     // 과거 내역
```

**공통 처리**:
- Authorization 헤더 자동 첨부
- 401 응답 → Auth.logout() 호출
- 요청/응답 JSON 자동 직렬화

---

## API 연동 맵

| 컴포넌트 | API 엔드포인트 |
|---|---|
| LoginScreen | POST /api/auth/admin-login |
| Dashboard (초기화) | GET /api/orders/summary |
| OrderDetailModal | PATCH /api/orders/{id}/status |
| OrderDetailModal | DELETE /api/orders/{id} |
| TableCard | POST /api/tables/{id}/complete |
| PastHistoryModal | GET /api/tables/{id}/history |
| AdminSSEClient | GET /api/sse/admin |
