# 애플리케이션 설계 통합 문서 (Application Design)

## 1. 시스템 아키텍처

```
+------------------+      +------------------+
|  Customer App    |      |   Admin App      |
|  (Vanilla JS)    |      |  (Vanilla JS)    |
|                  |      |                  |
| - 자동 로그인     |      | - JWT 인증        |
| - 메뉴 조회      |      | - 주문 대시보드   |
| - 장바구니       |      | - 테이블 관리     |
| - 주문 생성      |      | - SSE 수신       |
| - 주문 내역(SSE) |      |                  |
+--------+---------+      +--------+---------+
         |                         |
         |   HTTP REST + SSE       |
         +----------+  +-----------+
                    |  |
         +----------v--v----------+
         |     FastAPI Server     |
         |                        |
         |  /api/auth/*           |
         |  /api/menus/*          |
         |  /api/orders/*         |
         |  /api/tables/*         |
         |  /api/sse/*            |
         |                        |
         |  /customer/* (static)  |
         |  /admin/* (static)     |
         +----------+-------------+
                    |
         +----------v-------------+
         |   SQLite Database      |
         |                        |
         |  Store, Table, Menu    |
         |  Category, Order       |
         |  OrderItem             |
         |  OrderHistory          |
         +------------------------+
```

---

## 2. 컴포넌트 요약

### Backend 컴포넌트 (13개)

| ID | 컴포넌트 | 유형 | 역할 |
|---|---|---|---|
| BC-01 | AuthRouter | Router | 테이블/관리자 로그인 엔드포인트 |
| BC-02 | MenuRouter | Router | 메뉴/카테고리 조회 엔드포인트 |
| BC-03 | OrderRouter | Router | 주문 CRUD 엔드포인트 |
| BC-04 | TableRouter | Router | 테이블 관리 엔드포인트 |
| BC-05 | SSERouter | Router | SSE 스트림 엔드포인트 |
| BC-06 | AuthService | Service | 인증 비즈니스 로직 |
| BC-07 | MenuService | Service | 메뉴 조회 로직 |
| BC-08 | OrderService | Service | 주문 로직 + SSE 이벤트 발행 |
| BC-09 | TableService | Service | 세션 생명주기 관리 |
| BC-10 | SSEManager | Core | SSE 구독/발행 관리 |
| BC-11 | Database | Infrastructure | SQLite 연결 관리 |
| BC-12 | Models | Data | ORM 데이터 모델 (8개 모델) |
| BC-13 | Seed | Utility | 초기 데이터 생성 |

### Customer Frontend 컴포넌트 (7개)

| ID | 컴포넌트 | 역할 |
|---|---|---|
| FC-01 | CustomerApp Entry | SPA 진입점, 라우팅 |
| FC-02 | CustomerAuth | 자동 로그인, localStorage |
| FC-03 | MenuView | 카테고리/메뉴 렌더링 |
| FC-04 | CartManager | 장바구니 상태, localStorage |
| FC-05 | OrderView | 주문 확인 및 제출 |
| FC-06 | OrderHistoryView | 주문 내역 + SSE |
| FC-07 | CustomerAPI | API 통신 래퍼 |

### Admin Frontend 컴포넌트 (8개)

| ID | 컴포넌트 | 역할 |
|---|---|---|
| FA-01 | AdminApp Entry | SPA 진입점 |
| FA-02 | AdminAuth | JWT 인증, 세션 관리 |
| FA-03 | DashboardView | 테이블 그리드 대시보드 |
| FA-04 | OrderDetailModal | 주문 상세 + 상태 변경 |
| FA-05 | TableManager | 이용 완료 처리 |
| FA-06 | PastHistoryModal | 과거 주문 내역 |
| FA-07 | AdminSSEClient | SSE 연결 관리 |
| FA-08 | AdminAPI | API 통신 래퍼 |

---

## 3. 프로젝트 디렉토리 구조 (예상)

```
aidlc-table-order/
├── main.py                    # FastAPI 앱 진입점
├── database.py                # DB 연결
├── seed.py                    # 초기 데이터
├── requirements.txt
├── models/
│   ├── __init__.py
│   ├── store.py
│   ├── table.py
│   ├── menu.py
│   ├── order.py
│   └── order_history.py
├── schemas/
│   ├── __init__.py
│   ├── auth.py
│   ├── menu.py
│   ├── order.py
│   └── table.py
├── routers/
│   ├── __init__.py
│   ├── auth.py
│   ├── menu.py
│   ├── order.py
│   ├── table.py
│   └── sse.py
├── services/
│   ├── __init__.py
│   ├── auth_service.py
│   ├── menu_service.py
│   ├── order_service.py
│   └── table_service.py
├── core/
│   ├── __init__.py
│   ├── sse_manager.py
│   ├── security.py            # JWT, bcrypt 유틸
│   └── dependencies.py        # FastAPI Depends
└── static/
    ├── customer/
    │   ├── index.html
    │   ├── css/
    │   │   └── style.css
    │   └── js/
    │       ├── auth.js
    │       ├── menu.js
    │       ├── cart.js
    │       ├── order.js
    │       ├── order-history.js
    │       └── api.js
    └── admin/
        ├── index.html
        ├── css/
        │   └── style.css
        └── js/
            ├── auth.js
            ├── dashboard.js
            ├── order-detail.js
            ├── table-manager.js
            ├── past-history.js
            ├── sse.js
            └── api.js
```

---

## 4. 핵심 설계 결정 사항

| 결정 | 내용 | 근거 |
|---|---|---|
| **서빙 방식** | FastAPI가 API + 정적 파일 함께 서빙 | 로컬 개발 환경 단순화 |
| **SSE 구조** | 관리자용 / 고객용 별도 엔드포인트 | 이벤트 타입 분리, 인증 분리 |
| **인증 토큰** | 테이블: 커스텀 세션 토큰 / 관리자: JWT | 역할별 인증 요구사항 상이 |
| **장바구니** | 순수 클라이언트 측 (localStorage) | 서버 상태 최소화 |
| **세션 추적** | UUID 기반 session_id | Table 레코드에 현재 session_id 저장 |
| **OrderHistory** | 별도 테이블로 분리 | 세션 종료 시 이력 보존 + 현재 주문 초기화 |
| **SSEManager** | FastAPI app.state 싱글톤 | 여러 라우터에서 공유 필요 |

---

## 5. 상세 문서 참조

| 문서 | 내용 |
|---|---|
| `components.md` | 전체 컴포넌트 상세 정의 |
| `component-methods.md` | 메서드 시그니처 및 목적 |
| `services.md` | 서비스 레이어 오케스트레이션 흐름 |
| `component-dependency.md` | 의존성 매트릭스 및 통신 패턴 |
