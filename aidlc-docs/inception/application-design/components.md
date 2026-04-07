# 컴포넌트 정의 (Components)

## 시스템 아키텍처 개요

```
[Customer Browser]          [Admin Browser]
  Customer App                Admin App
  (Vanilla JS)               (Vanilla JS)
       |                          |
       +----------+  +-----------+
                  |  |
            [FastAPI Server]
            - REST API
            - SSE Endpoints
            - Static File Serving
                  |
            [SQLite DB]
```

**서빙 방식**: FastAPI가 백엔드 API + 정적 파일(HTML/CSS/JS)을 함께 서빙

---

## Backend Components (FastAPI)

### BC-01: AuthRouter (`routers/auth.py`)
**목적**: 테이블 인증 및 관리자 인증 엔드포인트 제공

**책임**:
- 테이블 로그인 요청 처리 (매장 식별자 + 테이블 번호 + 비밀번호)
- 관리자 로그인 요청 처리 (매장 식별자 + 사용자명 + 비밀번호)
- JWT 토큰 발급 및 반환
- 인증 실패 시 HTTP 401 응답

**인터페이스**:
- `POST /api/auth/table-login` → TableSession 토큰
- `POST /api/auth/admin-login` → JWT 토큰

---

### BC-02: MenuRouter (`routers/menu.py`)
**목적**: 메뉴 및 카테고리 조회 엔드포인트 제공

**책임**:
- 매장의 전체 메뉴 목록 반환 (카테고리별 그룹화)
- 카테고리 목록 반환
- 테이블 인증 검증 후 메뉴 접근 허용

**인터페이스**:
- `GET /api/menus` → 카테고리별 메뉴 목록
- `GET /api/categories` → 카테고리 목록

---

### BC-03: OrderRouter (`routers/order.py`)
**목적**: 주문 생성, 조회, 상태 변경, 삭제 엔드포인트 제공

**책임**:
- 주문 생성 처리 및 유효성 검증
- 테이블 세션 기준 주문 목록 조회
- 관리자 주문 상태 변경 처리
- 관리자 주문 삭제 처리
- 주문 이벤트를 SSEManager에 발행

**인터페이스**:
- `POST /api/orders` → 신규 주문 생성
- `GET /api/orders/table/{table_id}` → 현재 세션 주문 목록
- `PATCH /api/orders/{order_id}/status` → 주문 상태 변경
- `DELETE /api/orders/{order_id}` → 주문 삭제

---

### BC-04: TableRouter (`routers/table.py`)
**목적**: 테이블 초기 설정 및 세션 관리 엔드포인트 제공

**책임**:
- 테이블 초기 설정 (번호 + 비밀번호)
- 테이블 이용 완료 처리 (세션 종료)
- 과거 주문 내역 조회

**인터페이스**:
- `GET /api/tables` → 전체 테이블 목록 (관리자)
- `POST /api/tables/{table_id}/complete` → 테이블 이용 완료 처리
- `GET /api/tables/{table_id}/history` → 과거 주문 내역 (날짜 필터)

---

### BC-05: SSERouter (`routers/sse.py`)
**목적**: Server-Sent Events 스트림 엔드포인트 제공

**책임**:
- 관리자용 SSE 스트림 (신규 주문, 주문 삭제 이벤트)
- 고객용 SSE 스트림 (현재 세션 주문 상태 변경 이벤트)
- SSEManager를 통한 구독/발행 처리

**인터페이스**:
- `GET /api/sse/admin` → 관리자 이벤트 스트림 (JWT 인증)
- `GET /api/sse/table/{table_id}` → 테이블별 고객 이벤트 스트림 (테이블 인증)

---

### BC-06: AuthService (`services/auth_service.py`)
**목적**: 인증 비즈니스 로직 처리

**책임**:
- 테이블 자격 증명 검증
- 관리자 자격 증명 검증 (bcrypt 비밀번호 비교)
- JWT 토큰 생성 및 검증
- 테이블 세션 토큰 생성

---

### BC-07: MenuService (`services/menu_service.py`)
**목적**: 메뉴 비즈니스 로직 처리

**책임**:
- 매장 메뉴 조회 및 카테고리별 그룹화
- 메뉴 정렬 순서 적용

---

### BC-08: OrderService (`services/order_service.py`)
**목적**: 주문 비즈니스 로직 및 SSE 이벤트 발행

**책임**:
- 주문 생성 (OrderItem 포함) 및 세션 ID 연결
- 현재 테이블 세션 기준 주문 조회 (이전 세션 제외)
- 주문 상태 변경 및 SSE 이벤트 발행
- 주문 삭제 및 테이블 총 금액 재계산
- SSEManager를 통해 관리자/고객에게 이벤트 발행

---

### BC-09: TableService (`services/table_service.py`)
**목적**: 테이블 세션 관리 비즈니스 로직

**책임**:
- 테이블 이용 완료 처리 (현재 주문 → OrderHistory 이동)
- 테이블 현재 주문 및 총 금액 리셋
- 새 세션 ID 생성
- 과거 주문 내역 조회 (날짜 필터 포함)
- 테이블 목록 및 현재 주문 현황 집계

---

### BC-10: SSEManager (`core/sse_manager.py`)
**목적**: SSE 구독자 관리 및 이벤트 브로드캐스트

**책임**:
- 관리자 및 테이블별 SSE 구독자 큐 관리
- 이벤트 발행 (신규 주문, 상태 변경, 주문 삭제)
- 연결 끊김 처리 및 큐 정리

---

### BC-11: Database (`database.py`)
**목적**: SQLite 데이터베이스 연결 및 세션 관리

**책임**:
- SQLAlchemy 엔진 및 SessionLocal 생성
- DB 세션 의존성 주입 제공
- 테이블 생성 (create_all)

---

### BC-12: Models (`models/`)
**목적**: SQLAlchemy ORM 데이터 모델 정의

**모델 목록**:
- `Store` — 매장 (식별자, 이름, 관리자 계정)
- `Table` — 테이블 (번호, 비밀번호 해시, 현재 세션 ID)
- `Category` — 카테고리 (이름, 순서)
- `Menu` — 메뉴 (이름, 가격, 설명, 이미지 URL, 카테고리, 순서)
- `Order` — 주문 (테이블, 총 금액, 상태, 세션 ID, 생성 시각)
- `OrderItem` — 주문 항목 (주문, 메뉴명, 수량, 단가)
- `OrderHistory` — 과거 주문 이력 (세션 종료 시 이동)
- `OrderHistoryItem` — 과거 주문 항목

---

### BC-13: Seed (`seed.py`)
**목적**: 초기 데이터 생성

**책임**:
- 초기 매장 1개 생성 (식별자: `demo-store`)
- 관리자 계정 생성 (bcrypt 비밀번호 해싱)
- 샘플 카테고리 및 메뉴 데이터 생성 (이미지 URL 포함)
- 테이블 5개 생성 (기본 비밀번호 설정)

---

## Frontend Components — Customer App

### FC-01: CustomerApp Entry (`static/customer/index.html`)
**목적**: 고객 앱 진입점 — SPA 구조

**책임**:
- 페이지 로드 시 자동 로그인 시도
- 인증 상태에 따라 메뉴/초기설정 화면 표시
- 하단 탭 네비게이션 (메뉴 / 장바구니 / 주문내역)

---

### FC-02: CustomerAuth (`static/customer/js/auth.js`)
**목적**: 고객 앱 인증 관리

**책임**:
- localStorage에서 인증 정보 로드
- 서버에 자동 로그인 요청
- 인증 정보 저장/삭제
- 초기 설정 화면 렌더링

---

### FC-03: MenuView (`static/customer/js/menu.js`)
**목적**: 메뉴 목록 화면 렌더링

**책임**:
- 카테고리 탭 렌더링
- 메뉴 카드 그리드 렌더링
- 카테고리 필터링
- 메뉴 상세 모달 표시
- 장바구니 추가 이벤트 트리거

---

### FC-04: CartManager (`static/customer/js/cart.js`)
**목적**: 장바구니 상태 관리

**책임**:
- 장바구니 아이템 추가/수량 변경/삭제
- localStorage에 장바구니 상태 영속화
- 총 금액 계산
- 장바구니 전체 비우기
- 장바구니 아이콘 배지 업데이트

---

### FC-05: OrderView (`static/customer/js/order.js`)
**목적**: 주문 확인 및 제출 화면

**책임**:
- 장바구니 아이템 목록 렌더링
- 주문 확정 API 호출
- 성공: 주문 번호 표시 → 5초 후 메뉴 화면 리다이렉트
- 실패: 에러 메시지 표시, 장바구니 유지

---

### FC-06: OrderHistoryView (`static/customer/js/order-history.js`)
**목적**: 현재 세션 주문 내역 화면 및 SSE 수신

**책임**:
- 현재 세션 주문 내역 API 조회 및 렌더링
- SSE 연결로 주문 상태 실시간 업데이트
- SSE 연결 끊김 시 자동 재연결

---

### FC-07: CustomerAPI (`static/customer/js/api.js`)
**목적**: 고객 앱 API 통신 모듈

**책임**:
- Fetch API 래퍼 (인증 헤더 자동 첨부)
- API 에러 핸들링

---

## Frontend Components — Admin App

### FA-01: AdminApp Entry (`static/admin/index.html`)
**목적**: 관리자 앱 진입점 — SPA 구조

**책임**:
- JWT 토큰 유효성 확인
- 유효 시 대시보드, 없으면 로그인 화면 표시

---

### FA-02: AdminAuth (`static/admin/js/auth.js`)
**목적**: 관리자 인증 관리

**책임**:
- 로그인 폼 렌더링 및 제출 처리
- JWT 토큰 localStorage 저장/삭제
- 토큰 만료 감지 및 자동 로그아웃
- 로그아웃 처리

---

### FA-03: DashboardView (`static/admin/js/dashboard.js`)
**목적**: 테이블별 주문 현황 그리드 화면

**책임**:
- 전체 테이블 카드 그리드 렌더링
- 각 카드: 테이블 번호, 총 주문액, 최신 주문 미리보기
- 테이블별 필터링
- 신규 주문 강조 표시 (애니메이션)
- SSE 이벤트 수신 시 카드 업데이트

---

### FA-04: OrderDetailModal (`static/admin/js/order-detail.js`)
**목적**: 주문 상세 조회 모달

**책임**:
- 주문 전체 메뉴 목록 표시
- 주문 상태 변경 버튼 (대기중/준비중/완료)
- 주문 삭제 버튼 및 확인 팝업

---

### FA-05: TableManager (`static/admin/js/table-manager.js`)
**목적**: 테이블 세션 관리

**책임**:
- 이용 완료 처리 버튼 및 확인 팝업
- 과거 내역 모달 열기

---

### FA-06: PastHistoryModal (`static/admin/js/past-history.js`)
**목적**: 과거 주문 내역 조회 모달

**책임**:
- 테이블별 과거 주문 이력 렌더링 (시간 역순)
- 날짜 필터 UI
- 닫기 버튼으로 대시보드 복귀

---

### FA-07: AdminSSEClient (`static/admin/js/sse.js`)
**목적**: 관리자 앱 SSE 연결 관리

**책임**:
- 관리자 SSE 엔드포인트 연결
- 이벤트 타입별 핸들러 디스패치 (new_order, order_updated, order_deleted, session_completed)
- 연결 끊김 시 자동 재연결

---

### FA-08: AdminAPI (`static/admin/js/api.js`)
**목적**: 관리자 앱 API 통신 모듈

**책임**:
- Fetch API 래퍼 (JWT 헤더 자동 첨부)
- 401 응답 시 자동 로그아웃 처리
- API 에러 핸들링
