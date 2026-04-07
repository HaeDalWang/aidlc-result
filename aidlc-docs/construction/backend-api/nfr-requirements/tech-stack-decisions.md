# 기술 스택 결정 (Tech Stack Decisions) — backend-api

## 핵심 프레임워크

### FastAPI
- **선택 이유**:
  - 비동기(async/await) 네이티브 지원 → SSE 100개 동시 연결에 적합
  - Pydantic 기반 자동 스키마 검증 및 직렬화
  - StreamingResponse로 SSE 구현 간단
  - Python 타입 힌트 기반 자동 API 문서화 (Swagger UI)
- **버전**: FastAPI 0.110+
- **ASGI 서버**: uvicorn (asyncio 기반)

---

## 데이터베이스

### SQLite + SQLAlchemy ORM
- **선택 이유**:
  - 로컬 개발 환경 — 별도 DB 서버 불필요
  - 중간 규모(100명 동시 사용자) 허용 범위
  - Python 내장 지원, 설치 불필요
- **SQLAlchemy 버전**: 2.0+
- **WAL 모드**: 활성화 (읽기/쓰기 동시성 향상)
  ```python
  @event.listens_for(engine, "connect")
  def set_sqlite_pragma(dbapi_conn, connection_record):
      cursor = dbapi_conn.cursor()
      cursor.execute("PRAGMA journal_mode=WAL")
      cursor.close()
  ```
- **연결 설정**: `check_same_thread=False` (FastAPI 멀티스레드 환경 대응)

---

## 인증 라이브러리

### passlib[bcrypt]
- **용도**: 관리자 비밀번호 해싱/검증
- **설정**: bcrypt rounds=12
- **설치**: `pip install passlib[bcrypt]`

### python-jose[cryptography]
- **용도**: JWT 토큰 생성/검증
- **알고리즘**: HS256
- **설치**: `pip install python-jose[cryptography]`

---

## 전체 의존성 목록

```
# requirements.txt
fastapi==0.110.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.28
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
pydantic==2.6.0
```

> **참고**: uvicorn[standard]는 websockets, httptools 포함 (성능 향상)

---

## 주요 설계 패턴

### 의존성 주입 (FastAPI Depends)
```python
# DB 세션
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 테이블 인증
def get_table_auth(token: str = Header(...)) -> TableAuth:
    return verify_table_token(token)

# 관리자 인증
def get_admin_auth(token: str = Header(...)) -> AdminAuth:
    return verify_jwt_token(token)

# SSEManager (싱글톤)
def get_sse_manager(request: Request) -> SSEManager:
    return request.app.state.sse_manager
```

### SSE StreamingResponse
```python
async def event_generator(store_id: int, sse_manager: SSEManager):
    async for event in sse_manager.subscribe_admin(store_id):
        yield f"data: {json.dumps(event)}\n\n"

return StreamingResponse(
    event_generator(store_id, sse_manager),
    media_type="text/event-stream",
    headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
    }
)
```

### Pydantic 스키마 분리
- `schemas/auth.py` — 로그인 요청/응답
- `schemas/menu.py` — 메뉴/카테고리 응답
- `schemas/order.py` — 주문 요청/응답
- `schemas/table.py` — 테이블 관리 요청/응답

---

## 개발 환경 설정

```python
# core/config.py
DATABASE_URL = "sqlite:///./table_order.db"
JWT_SECRET_KEY = "dev-secret-key-change-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 16
CORS_ORIGINS = ["*"]  # 개발 환경
```

---

## 진입점 구조

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="테이블오더 API")

app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)

app.mount("/customer", StaticFiles(directory="static/customer", html=True))
app.mount("/admin", StaticFiles(directory="static/admin", html=True))

app.include_router(auth_router, prefix="/api", tags=["auth"])
app.include_router(menu_router, prefix="/api", tags=["menu"])
app.include_router(order_router, prefix="/api", tags=["order"])
app.include_router(table_router, prefix="/api", tags=["table"])
app.include_router(sse_router, prefix="/api", tags=["sse"])

@app.on_event("startup")
async def startup():
    init_db()
    app.state.sse_manager = SSEManager()
```
