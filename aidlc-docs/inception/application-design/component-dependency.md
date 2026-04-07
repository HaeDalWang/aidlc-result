# 컴포넌트 의존성 및 통신 패턴 (Component Dependencies)

## 의존성 매트릭스

### Backend

| 컴포넌트 | 의존 대상 |
|---|---|
| AuthRouter | AuthService, get_db |
| MenuRouter | MenuService, get_db, get_table_auth |
| OrderRouter | OrderService, get_db, get_table_auth, get_admin_auth, SSEManager |
| TableRouter | TableService, get_db, get_admin_auth, SSEManager |
| SSERouter | SSEManager, get_table_auth, get_admin_auth |
| AuthService | DB Models (Store, Table, Admin), passlib, python-jose |
| MenuService | DB Models (Category, Menu) |
| OrderService | DB Models (Order, OrderItem), SSEManager |
| TableService | DB Models (Table, Order, OrderHistory), SSEManager, uuid |
| SSEManager | asyncio (없음 — 독립적) |

### Customer Frontend

| 컴포넌트 | 의존 대상 |
|---|---|
| index.html | CustomerAuth, MenuView, CartManager, OrderView, OrderHistoryView |
| CustomerAuth | CustomerAPI, localStorage |
| MenuView | CustomerAPI, CartManager |
| CartManager | localStorage |
| OrderView | CustomerAPI, CartManager |
| OrderHistoryView | CustomerAPI, SSEClient (Customer) |
| CustomerAPI | CustomerAuth (헤더) |

### Admin Frontend

| 컴포넌트 | 의존 대상 |
|---|---|
| index.html | AdminAuth, DashboardView |
| AdminAuth | AdminAPI, localStorage |
| DashboardView | AdminAPI, AdminSSEClient, OrderDetailModal, TableManager |
| OrderDetailModal | AdminAPI |
| TableManager | AdminAPI, PastHistoryModal |
| PastHistoryModal | AdminAPI |
| AdminSSEClient | AdminAuth (JWT 헤더) |
| AdminAPI | AdminAuth (헤더) |

---

## 통신 패턴

### 1. REST API (동기 HTTP)

```
[Customer/Admin Browser]
        |
        | HTTP Request (Fetch API)
        v
[FastAPI Router]
        |
        | 인증 검증 (Depends)
        v
[Service Layer]
        |
        | ORM Query
        v
[SQLite DB]
```

**사용 상황**: 주문 생성, 메뉴 조회, 상태 변경, 테이블 관리

---

### 2. Server-Sent Events (단방향 스트리밍)

```
[Admin/Customer Browser] ←──── SSE Stream ────── [FastAPI SSERouter]
                                                         |
                                                   [SSEManager]
                                                         ^
                                                         | publish()
                                                  [OrderService /
                                                   TableService]
```

**이벤트 흐름**:

```
주문 생성 시:
  Customer → POST /api/orders → OrderService
                                    → SSEManager.publish_to_admin()
                                          → Admin Browser (new_order event)

주문 상태 변경 시:
  Admin → PATCH /api/orders/{id}/status → OrderService
                                              → SSEManager.publish_to_admin()
                                              → SSEManager.publish_to_table()
                                                    → Customer Browser (order_updated event)

테이블 이용 완료 시:
  Admin → POST /api/tables/{id}/complete → TableService
                                              → SSEManager.publish_to_admin()
                                                    → Admin Browser (session_completed event)
```

---

### 3. localStorage (브라우저 영속 저장)

```
[Customer App]
  CartManager ←→ localStorage["cart"]          // 장바구니 데이터
  CustomerAuth ←→ localStorage["table_auth"]   // 테이블 인증 정보

[Admin App]
  AdminAuth ←→ localStorage["admin_token"]     // JWT 토큰
```

---

## 데이터 흐름 다이어그램

### 주문 생성 플로우

```
Customer Browser          FastAPI Server           SQLite DB
      |                        |                       |
      |-- POST /api/orders --> |                       |
      |                        |-- INSERT Order -----> |
      |                        |-- INSERT OrderItems-> |
      |                        |                       |
      |                        |--- SSE Event -------> Admin Browser
      |                        |    (new_order)
      |<-- OrderResponse ------|
      |                        |
      |  (5초 후 메뉴화면)
```

### 테이블 이용 완료 플로우

```
Admin Browser             FastAPI Server           SQLite DB
      |                        |                       |
      |-- POST /tables/{id}/complete --> |             |
      |                        |-- SELECT Orders ----> |
      |                        |-- INSERT OrderHistory>|
      |                        |-- DELETE Orders ------>|
      |                        |-- UPDATE Table.session_id -->|
      |                        |                       |
      |                        |--- SSE Event -------> Admin Browser
      |                        |    (session_completed)
      |<-- SessionCompleteResult -|
```

---

## 인증 흐름

```
테이블 인증:
  Browser → localStorage["table_auth"]
          → POST /api/auth/table-login
          → 서버 검증
          → session_token 반환
          → localStorage 저장
          → 이후 API 요청 시 Authorization: Bearer {token}

관리자 인증:
  Browser → POST /api/auth/admin-login
          → JWT 발급 (16시간)
          → localStorage["admin_token"] 저장
          → 이후 API 요청 시 Authorization: Bearer {jwt}
          → 401 응답 시 → 로그아웃 → 로그인 화면
```
