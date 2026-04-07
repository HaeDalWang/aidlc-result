# 작업 단위 정의 (Unit of Work)

## 개요

테이블오더 서비스는 단일 레포지토리 내 3개의 작업 단위(Unit)로 구성됩니다.
FastAPI 서버가 백엔드 API와 정적 파일(프론트엔드)을 함께 서빙합니다.

---

## Unit 1: backend-api

### 기본 정보
| 항목 | 내용 |
|---|---|
| **Unit ID** | `backend-api` |
| **유형** | Backend Service |
| **기술 스택** | Python 3.11+, FastAPI, SQLAlchemy, SQLite, python-jose, passlib |
| **코드 위치** | `/` (프로젝트 루트) |
| **진입점** | `main.py` |

### 책임
- REST API 엔드포인트 제공 (인증, 메뉴, 주문, 테이블)
- SSE 스트림 엔드포인트 제공
- SQLite 데이터베이스 관리
- 비즈니스 로직 처리 (주문 생성, 세션 관리, 상태 변경)
- 정적 파일(프론트엔드) 서빙
- 초기 데이터(Seed) 생성

### 포함 컴포넌트
| 컴포넌트 | 파일 경로 |
|---|---|
| AuthRouter | `routers/auth.py` |
| MenuRouter | `routers/menu.py` |
| OrderRouter | `routers/order.py` |
| TableRouter | `routers/table.py` |
| SSERouter | `routers/sse.py` |
| AuthService | `services/auth_service.py` |
| MenuService | `services/menu_service.py` |
| OrderService | `services/order_service.py` |
| TableService | `services/table_service.py` |
| SSEManager | `core/sse_manager.py` |
| Security Utils | `core/security.py` |
| Dependencies | `core/dependencies.py` |
| Database | `database.py` |
| Models | `models/` (store, table, menu, order, order_history) |
| Schemas | `schemas/` (auth, menu, order, table) |
| Seed | `seed.py` |

### 주요 API 엔드포인트
```
POST /api/auth/table-login
POST /api/auth/admin-login

GET  /api/menus
GET  /api/categories

POST   /api/orders
GET    /api/orders/table/{table_id}
PATCH  /api/orders/{order_id}/status
DELETE /api/orders/{order_id}

GET  /api/tables
POST /api/tables/{table_id}/complete
GET  /api/tables/{table_id}/history

GET  /api/sse/admin
GET  /api/sse/table/{table_id}
```

### 실행 방법 (예상)
```bash
pip install -r requirements.txt
python seed.py   # 초기 데이터 생성
uvicorn main:app --reload --port 8000
```

---

## Unit 2: customer-frontend

### 기본 정보
| 항목 | 내용 |
|---|---|
| **Unit ID** | `customer-frontend` |
| **유형** | Frontend (Static Files) |
| **기술 스택** | Vanilla JavaScript (ES6+), HTML5, CSS3 |
| **코드 위치** | `/static/customer/` |
| **진입점** | `static/customer/index.html` |
| **서빙** | FastAPI StaticFiles (`/customer` 경로) |

### 책임
- 테이블 자동 로그인 및 초기 설정 화면
- 카테고리별 메뉴 목록 및 상세 표시
- 장바구니 상태 관리 (localStorage 영속성)
- 주문 생성 및 결과 표시
- 현재 세션 주문 내역 및 실시간 상태 업데이트 (SSE)

### 포함 컴포넌트
| 컴포넌트 | 파일 경로 |
|---|---|
| App Entry | `static/customer/index.html` |
| CustomerAuth | `static/customer/js/auth.js` |
| MenuView | `static/customer/js/menu.js` |
| CartManager | `static/customer/js/cart.js` |
| OrderView | `static/customer/js/order.js` |
| OrderHistoryView | `static/customer/js/order-history.js` |
| CustomerAPI | `static/customer/js/api.js` |
| Styles | `static/customer/css/style.css` |

### 화면 구성
```
index.html
├── [초기 설정 화면]   ← localStorage 인증 정보 없을 때
└── [메인 앱]
    ├── 상단: 매장명 / 테이블 번호
    ├── 콘텐츠 영역:
    │   ├── 메뉴 화면 (기본)
    │   ├── 장바구니 화면
    │   └── 주문 내역 화면
    └── 하단 탭 네비게이션: 메뉴 | 장바구니 | 주문내역
```

---

## Unit 3: admin-frontend

### 기본 정보
| 항목 | 내용 |
|---|---|
| **Unit ID** | `admin-frontend` |
| **유형** | Frontend (Static Files) |
| **기술 스택** | Vanilla JavaScript (ES6+), HTML5, CSS3 |
| **코드 위치** | `/static/admin/` |
| **진입점** | `static/admin/index.html` |
| **서빙** | FastAPI StaticFiles (`/admin` 경로) |

### 책임
- 관리자 로그인 및 JWT 세션 관리
- 테이블별 주문 현황 그리드 대시보드 (SSE 실시간)
- 주문 상세 조회 및 상태 변경
- 주문 삭제 (직권 수정)
- 테이블 이용 완료 처리 (세션 종료)
- 과거 주문 내역 조회 (날짜 필터)

### 포함 컴포넌트
| 컴포넌트 | 파일 경로 |
|---|---|
| App Entry | `static/admin/index.html` |
| AdminAuth | `static/admin/js/auth.js` |
| DashboardView | `static/admin/js/dashboard.js` |
| OrderDetailModal | `static/admin/js/order-detail.js` |
| TableManager | `static/admin/js/table-manager.js` |
| PastHistoryModal | `static/admin/js/past-history.js` |
| AdminSSEClient | `static/admin/js/sse.js` |
| AdminAPI | `static/admin/js/api.js` |
| Styles | `static/admin/css/style.css` |

### 화면 구성
```
index.html
├── [로그인 화면]     ← JWT 토큰 없거나 만료 시
└── [대시보드]
    ├── 상단: 매장명 / 로그아웃 버튼
    ├── 테이블 필터 바
    ├── 테이블 그리드 (카드 레이아웃)
    │   └── 각 카드: 테이블 번호 / 총 주문액 / 최신 주문 미리보기
    │         ├── 주문 상세 모달 (클릭 시)
    │         ├── 이용 완료 버튼
    │         └── 과거 내역 버튼
    └── [모달]
        ├── 주문 상세 모달 (상태 변경 / 삭제)
        └── 과거 내역 모달 (날짜 필터)
```

---

## 개발 실행 순서

```
1. Unit 1 (backend-api)
   - 데이터 모델 설계 및 구현
   - API 엔드포인트 구현
   - SSE 구현
   - 시드 데이터 생성

2. Unit 2 (customer-frontend)
   - 백엔드 API 연동
   - 자동 로그인 → 메뉴 → 장바구니 → 주문 플로우 구현
   - 주문 내역 SSE 구현

3. Unit 3 (admin-frontend)
   - 백엔드 API 연동
   - 로그인 → 대시보드 구현
   - 테이블 관리 기능 구현
   - SSE 실시간 업데이트 구현
```
