# 논리적 컴포넌트 (Logical Components) — backend-api

## 컴포넌트 구조 개요

```
main.py (FastAPI App)
    |
    +── Middleware
    |   └── CORSMiddleware
    |
    +── StaticFiles
    |   ├── /customer → static/customer/
    |   └── /admin → static/admin/
    |
    +── Routers (/api/*)
    |   ├── auth_router
    |   ├── menu_router
    |   ├── order_router
    |   ├── table_router
    |   └── sse_router
    |
    +── App State (startup에서 초기화)
    |   └── sse_manager: SSEManager (싱글톤)
    |
    +── Core
        ├── database.py (SQLite + WAL)
        ├── security.py (JWT, bcrypt)
        └── dependencies.py (Depends 함수들)
```

---

## LC-01: SSEManager (싱글톤)

**역할**: 비동기 이벤트 브로드캐스트 허브

**생명주기**: FastAPI 앱 startup 시 생성 → 앱 종료 시 소멸

**내부 상태**:
```python
admin_queues: dict[int, list[asyncio.Queue]]  # store_id → [Queue, ...]
table_queues: dict[int, list[asyncio.Queue]]  # table_id → [Queue, ...]
```

**메모리 관리**:
- 구독 연결 시 큐 추가
- 연결 종료(`GeneratorExit`) 시 큐 제거
- 빈 리스트가 남아있어도 정상 동작 (publish 시 빈 리스트 무시)

**스레드 안전성**:
- asyncio 단일 이벤트 루프 내 동작 → 별도 락 불필요
- `put_nowait`는 asyncio 이벤트 루프 내에서 안전

---

## LC-02: Database Session 관리

**역할**: 요청 당 SQLite 세션 생성 및 정리

**패턴**: FastAPI Depends + context manager
```
HTTP 요청
    → get_db() Depends 호출
    → SessionLocal() 생성
    → Router/Service에서 사용
    → 요청 완료 후 session.close()
```

**트랜잭션 관리**:
- 성공: `db.commit()` → 자동 완료
- 실패: `db.rollback()` (SQLAlchemy 자동 처리) → 500 응답

---

## LC-03: JWT 토큰 저장소 (클라이언트 측)

**서버 역할**: 토큰 생성 + 검증만 담당 (무상태)

**토큰 구조**:

```json
// 관리자 토큰
{
  "admin_id": 1,
  "store_id": 1,
  "type": "admin",
  "exp": 1712345678
}

// 테이블 토큰
{
  "table_id": 3,
  "store_id": 1,
  "session_id": "uuid-v4",
  "type": "table"
}
```

**서버 무상태 설계**:
- 토큰 블랙리스트 없음 (로그아웃 = 클라이언트 토큰 삭제)
- 세션 만료는 JWT `exp` 클레임으로만 처리
- 이유: 로컬 개발 환경 단순성 유지

---

## LC-04: 정적 파일 서빙

**역할**: 프론트엔드 HTML/CSS/JS를 FastAPI가 직접 서빙

**마운트 구성**:
```
GET /customer/     → static/customer/index.html
GET /customer/*    → static/customer/* (CSS, JS 등)
GET /admin/        → static/admin/index.html
GET /admin/*       → static/admin/*
```

**SPA 지원**:
- `html=True` 옵션: 경로 미일치 시 index.html 반환 (SPA 라우팅)

---

## LC-05: Seed 데이터 컴포넌트

**역할**: 개발/데모용 초기 데이터 생성

**실행 방식**: `python seed.py` (서버와 독립 실행)

**생성 데이터**:
```
Store: { identifier: "demo-store", name: "데모 매장" }

Admin: { username: "admin", password: "admin1234" (bcrypt) }

Categories: [
  { name: "메인 메뉴", sort_order: 1 },
  { name: "음료", sort_order: 2 },
  { name: "사이드", sort_order: 3 }
]

Menus: [
  { name: "김치찌개", price: 9000, category: "메인 메뉴", image_url: "..." },
  { name: "된장찌개", price: 8000, category: "메인 메뉴", image_url: "..." },
  { name: "비빔밥",   price: 10000, category: "메인 메뉴", image_url: "..." },
  { name: "콜라",     price: 2000, category: "음료", image_url: "..." },
  { name: "사이다",   price: 2000, category: "음료", image_url: "..." },
  { name: "공기밥",   price: 1000, category: "사이드", image_url: "..." },
]

Tables: [
  { table_number: 1, password: "1111", session_id: uuid },
  { table_number: 2, password: "2222", session_id: uuid },
  { table_number: 3, password: "3333", session_id: uuid },
  { table_number: 4, password: "4444", session_id: uuid },
  { table_number: 5, password: "5555", session_id: uuid },
]
```

**멱등성 보장**:
```python
# get_or_create 패턴
store = db.query(Store).filter_by(identifier="demo-store").first()
if not store:
    store = Store(identifier="demo-store", name="데모 매장")
    db.add(store)
    db.commit()
```

---

## LC-06: 인덱스 설계 (SQLite)

**성능 최적화를 위한 인덱스**:

```sql
-- 주문 조회 최적화 (BL-05: 현재 세션 주문 내역)
CREATE INDEX idx_order_table_session
ON orders (table_id, session_id);

-- 관리자 대시보드 최적화 (BL-09)
CREATE INDEX idx_order_store_table
ON orders (store_id, table_id);

-- 과거 이력 조회 최적화 (BL-10)
CREATE INDEX idx_history_table_completed
ON order_history (table_id, completed_at DESC);

-- 메뉴 조회 최적화 (BL-03)
CREATE INDEX idx_menu_store_category
ON menus (store_id, category_id);
```

**SQLAlchemy에서 선언**:
```python
class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        Index("idx_order_table_session", "table_id", "session_id"),
        Index("idx_order_store_table", "store_id", "table_id"),
    )
```

---

## 컴포넌트 상호작용 요약

```
HTTP 요청
    → CORSMiddleware (origin 검증)
    → Router (엔드포인트 매칭)
    → Depends(get_table_auth / get_admin_auth)  ← JWT/토큰 검증
    → Depends(get_db)                           ← DB 세션 생성
    → Depends(get_sse_manager)                  ← SSEManager 참조
    → Service 메서드 호출
        → DB 쿼리 (store_id 필터 포함)
        → SSEManager.publish() (필요 시)
    → Response 반환
    → DB 세션 자동 close
```
