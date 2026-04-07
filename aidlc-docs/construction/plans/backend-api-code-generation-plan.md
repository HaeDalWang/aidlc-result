# Code Generation Plan — backend-api

## 컨텍스트

- **Unit**: backend-api
- **코드 위치**: `/` (워크스페이스 루트)
- **구조 패턴**: Greenfield monolith (FastAPI 단일 서버)
- **담당 스토리**: US-001~002(인증), US-003(메뉴), US-007~010(주문), US-011~018(관리자)

## 구현 스토리 매핑

| 스텝 | 관련 스토리 |
|---|---|
| Step 3 (Models) | US-001~018 전체 (데이터 기반) |
| Step 4 (Schemas) | US-001~018 전체 |
| Step 5 (Core) | US-001, US-011~012 (인증) |
| Step 6 (Services) | US-001~018 비즈니스 로직 |
| Step 7 (Routers) | US-001~018 API 엔드포인트 |
| Step 8 (SSE) | US-009, US-013 (실시간) |
| Step 9 (main.py) | 전체 통합 |
| Step 10 (Seed) | US-001~002 (초기 데이터) |

---

## 실행 체크리스트

### PART 1 — PLANNING
- [x] Step 1: 컨텍스트 분석
- [x] Step 2: 코드 생성 계획 수립 (이 파일)
- [ ] Step 3: 사용자 승인 대기

### PART 2 — GENERATION

- [x] Step 4: 프로젝트 구조 생성 (`requirements.txt`, 디렉토리)
- [x] Step 5: Core 인프라 (`core/config.py`, `core/security.py`, `database.py`)
- [x] Step 6: SSEManager (`core/sse_manager.py`)
- [x] Step 7: 의존성 주입 (`core/dependencies.py`)
- [x] Step 8: 데이터 모델 (`models/`)
- [x] Step 9: Pydantic 스키마 (`schemas/`)
- [x] Step 10: AuthService + AuthRouter (`services/auth_service.py`, `routers/auth.py`)
- [x] Step 11: MenuService + MenuRouter (`services/menu_service.py`, `routers/menu.py`)
- [x] Step 12: OrderService + OrderRouter (`services/order_service.py`, `routers/order.py`)
- [x] Step 13: TableService + TableRouter (`services/table_service.py`, `routers/table.py`)
- [x] Step 14: SSERouter (`routers/sse.py`)
- [x] Step 15: 진입점 (`main.py`)
- [x] Step 16: 시드 데이터 (`seed.py`)
- [x] Step 17: 정적 파일 플레이스홀더 (`static/customer/`, `static/admin/`)
- [x] Step 18: 코드 요약 문서 (`aidlc-docs/construction/backend-api/code/summary.md`)

---

## 생성 파일 목록

```
/                           ← 워크스페이스 루트 (애플리케이션 코드)
├── requirements.txt
├── main.py
├── database.py
├── seed.py
├── core/
│   ├── __init__.py
│   ├── config.py
│   ├── security.py
│   ├── dependencies.py
│   └── sse_manager.py
├── models/
│   ├── __init__.py
│   ├── store.py
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
└── static/
    ├── customer/
    │   └── index.html      ← 플레이스홀더 (Unit 2에서 구현)
    └── admin/
        └── index.html      ← 플레이스홀더 (Unit 3에서 구현)
```
