# 컴포넌트 메서드 시그니처 (Component Methods)

> 상세 비즈니스 로직은 CONSTRUCTION 단계의 Functional Design에서 정의됩니다.
> 이 문서는 메서드 시그니처와 고수준 목적만 기술합니다.

---

## Backend Services

### AuthService (`services/auth_service.py`)

```python
async def verify_table_credentials(
    store_identifier: str,
    table_number: int,
    table_password: str,
    db: Session
) -> TableCredentialResult:
    """테이블 자격 증명 검증. 성공 시 테이블 정보와 세션 토큰 반환."""

async def verify_admin_credentials(
    store_identifier: str,
    username: str,
    password: str,
    db: Session
) -> AdminCredentialResult:
    """관리자 자격 증명 검증 (bcrypt). 성공 시 JWT 토큰 반환."""

def create_jwt_token(admin_id: int, store_id: int) -> str:
    """16시간 만료 JWT 토큰 생성."""

def verify_jwt_token(token: str) -> JWTPayload:
    """JWT 토큰 검증. 실패 시 HTTPException(401) 발생."""

def create_table_session_token(table_id: int, session_id: str) -> str:
    """테이블 세션 토큰 생성."""
```

---

### MenuService (`services/menu_service.py`)

```python
async def get_menus_by_category(
    store_id: int,
    db: Session
) -> list[CategoryWithMenus]:
    """매장의 전체 메뉴를 카테고리별로 그룹화하여 반환. 순서 적용."""

async def get_categories(
    store_id: int,
    db: Session
) -> list[Category]:
    """매장의 카테고리 목록을 순서대로 반환."""
```

---

### OrderService (`services/order_service.py`)

```python
async def create_order(
    table_id: int,
    session_id: str,
    items: list[OrderItemInput],
    db: Session,
    sse_manager: SSEManager
) -> Order:
    """주문 생성 + OrderItem 저장. SSE로 관리자에게 new_order 이벤트 발행."""

async def get_orders_by_session(
    table_id: int,
    session_id: str,
    db: Session
) -> list[Order]:
    """현재 세션 ID 기준으로 주문 목록 조회 (이전 세션 제외)."""

async def update_order_status(
    order_id: int,
    new_status: OrderStatus,
    store_id: int,
    db: Session,
    sse_manager: SSEManager
) -> Order:
    """주문 상태 변경. SSE로 관리자 및 해당 테이블 고객에게 order_updated 이벤트 발행."""

async def delete_order(
    order_id: int,
    store_id: int,
    db: Session,
    sse_manager: SSEManager
) -> DeleteResult:
    """주문 삭제. 테이블 총 금액 재계산. SSE로 order_deleted 이벤트 발행."""

async def get_all_tables_summary(
    store_id: int,
    db: Session
) -> list[TableOrderSummary]:
    """관리자 대시보드용 테이블별 현재 주문 요약 조회."""
```

---

### TableService (`services/table_service.py`)

```python
async def complete_table_session(
    table_id: int,
    store_id: int,
    db: Session,
    sse_manager: SSEManager
) -> SessionCompleteResult:
    """
    테이블 이용 완료 처리:
    1. 현재 세션 주문 → OrderHistory 이동
    2. 테이블 주문 목록 초기화
    3. 새 세션 ID 생성
    4. SSE로 session_completed 이벤트 발행
    """

async def get_past_order_history(
    table_id: int,
    store_id: int,
    date_from: date | None,
    date_to: date | None,
    db: Session
) -> list[OrderHistoryGroup]:
    """테이블의 과거 주문 이력 조회 (날짜 필터 적용, 시간 역순)."""

async def get_tables_list(
    store_id: int,
    db: Session
) -> list[TableInfo]:
    """관리자용 전체 테이블 목록 조회."""
```

---

### SSEManager (`core/sse_manager.py`)

```python
async def subscribe_admin(store_id: int) -> AsyncGenerator:
    """관리자 SSE 구독. 이벤트 큐 생성 및 스트림 반환."""

async def subscribe_table(table_id: int) -> AsyncGenerator:
    """테이블(고객) SSE 구독. 이벤트 큐 생성 및 스트림 반환."""

async def publish_to_admin(store_id: int, event: SSEEvent) -> None:
    """해당 매장 관리자 구독자 전체에게 이벤트 발행."""

async def publish_to_table(table_id: int, event: SSEEvent) -> None:
    """특정 테이블 구독자에게 이벤트 발행."""

def unsubscribe(subscription_id: str) -> None:
    """구독 해제 및 큐 정리."""
```

---

## Backend Routers — 주요 엔드포인트

### AuthRouter (`routers/auth.py`)

```python
@router.post("/api/auth/table-login")
async def table_login(
    credentials: TableLoginRequest,
    db: Session = Depends(get_db)
) -> TableLoginResponse:
    """테이블 자동 로그인. 세션 토큰 반환."""

@router.post("/api/auth/admin-login")
async def admin_login(
    credentials: AdminLoginRequest,
    db: Session = Depends(get_db)
) -> AdminLoginResponse:
    """관리자 로그인. JWT 토큰 반환."""
```

---

### OrderRouter (`routers/order.py`)

```python
@router.post("/api/orders")
async def create_order(
    order: CreateOrderRequest,
    table_auth: TableAuth = Depends(get_table_auth),
    db: Session = Depends(get_db),
    sse: SSEManager = Depends(get_sse_manager)
) -> OrderResponse: ...

@router.get("/api/orders/table/{table_id}")
async def get_table_orders(
    table_id: int,
    table_auth: TableAuth = Depends(get_table_auth),
    db: Session = Depends(get_db)
) -> list[OrderResponse]: ...

@router.patch("/api/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    body: UpdateStatusRequest,
    admin: AdminAuth = Depends(get_admin_auth),
    db: Session = Depends(get_db),
    sse: SSEManager = Depends(get_sse_manager)
) -> OrderResponse: ...

@router.delete("/api/orders/{order_id}")
async def delete_order(
    order_id: int,
    admin: AdminAuth = Depends(get_admin_auth),
    db: Session = Depends(get_db),
    sse: SSEManager = Depends(get_sse_manager)
) -> DeleteResponse: ...
```

---

## Frontend — Customer App

### CartManager (`static/customer/js/cart.js`)

```javascript
CartManager.addItem(menuItem)          // 메뉴 추가 또는 수량 증가
CartManager.removeItem(menuId)         // 메뉴 제거
CartManager.updateQuantity(menuId, qty) // 수량 직접 설정
CartManager.clear()                    // 장바구니 전체 비우기
CartManager.getItems()                 // 현재 장바구니 아이템 배열 반환
CartManager.getTotalPrice()            // 총 금액 계산
CartManager.saveToStorage()            // localStorage에 저장
CartManager.loadFromStorage()          // localStorage에서 복원
```

---

### CustomerAuth (`static/customer/js/auth.js`)

```javascript
CustomerAuth.loadCredentials()         // localStorage에서 인증 정보 로드
CustomerAuth.autoLogin()               // 서버 자동 로그인 시도
CustomerAuth.saveCredentials(creds)    // 인증 정보 localStorage 저장
CustomerAuth.clearCredentials()        // 인증 정보 삭제
CustomerAuth.getSessionId()            // 현재 세션 ID 반환
CustomerAuth.getAuthHeader()           // API 인증 헤더 반환
```

---

## Frontend — Admin App

### AdminSSEClient (`static/admin/js/sse.js`)

```javascript
AdminSSEClient.connect(token)          // SSE 연결 시작
AdminSSEClient.disconnect()            // SSE 연결 종료
AdminSSEClient.on(eventType, handler)  // 이벤트 핸들러 등록
AdminSSEClient.reconnect()             // 자동 재연결 (지수 백오프)
```

**이벤트 타입**:
- `new_order` — 신규 주문 발생
- `order_updated` — 주문 상태 변경
- `order_deleted` — 주문 삭제
- `session_completed` — 테이블 세션 종료

---

## 데이터 전송 객체 (DTO / Pydantic Schemas)

```python
# 요청
TableLoginRequest     # store_identifier, table_number, table_password
AdminLoginRequest     # store_identifier, username, password
CreateOrderRequest    # table_id, session_id, items: [OrderItemInput]
OrderItemInput        # menu_id, menu_name, quantity, unit_price
UpdateStatusRequest   # status: OrderStatus

# 응답
TableLoginResponse    # token, table_id, table_number, session_id
AdminLoginResponse    # token, admin_id, store_id
OrderResponse         # id, table_id, session_id, items, total_amount, status, created_at
TableOrderSummary     # table_id, table_number, total_amount, recent_orders[n]
OrderHistoryGroup     # session_id, completed_at, orders

# SSE 이벤트
SSEEvent             # event_type, data: dict
```
