# NFR 설계 패턴 (NFR Design Patterns) — backend-api

## Pattern 1: SSE Pub/Sub (asyncio.Queue 기반)

**해결 NFR**: NFR-P-01 (SSE 2초 이내), NFR-P-03 (동시 100개 연결), NFR-R-02 (구독자 격리)

### 패턴 구조
```
[이벤트 생산자]           [SSEManager]              [이벤트 소비자]
OrderService    ──→   publish_to_admin()   ──→   asyncio.Queue(admin)
TableService    ──→   publish_to_table()   ──→   asyncio.Queue(table)
                                                       ↓
                                               StreamingResponse
                                               (SSE 텍스트 스트림)
```

### 구현 설계
```python
class SSEManager:
    def __init__(self):
        # store_id → list of Queue (여러 관리자 탭/기기 지원)
        self.admin_queues: dict[int, list[asyncio.Queue]] = {}
        # table_id → list of Queue
        self.table_queues: dict[int, list[asyncio.Queue]] = {}

    async def subscribe_admin(self, store_id: int):
        queue = asyncio.Queue(maxsize=100)
        self.admin_queues.setdefault(store_id, []).append(queue)
        try:
            while True:
                event = await asyncio.wait_for(queue.get(), timeout=30.0)
                yield event
        except asyncio.TimeoutError:
            yield ": ping"  # keep-alive
        except GeneratorExit:
            pass
        finally:
            self.admin_queues[store_id].remove(queue)

    async def publish_to_admin(self, store_id: int, event: dict):
        for queue in self.admin_queues.get(store_id, []):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                pass  # 큐 가득 참 → 해당 구독자 이벤트 스킵
```

**핵심 설계 결정**:
- `maxsize=100`: 큐 크기 제한으로 메모리 폭증 방지
- `wait_for(timeout=30)`: 30초 keep-alive ping
- `put_nowait` + catch QueueFull: 느린 구독자가 다른 구독자에 영향 없음
- `finally` 블록: 연결 종료 시 반드시 큐 제거

---

## Pattern 2: Dependency Injection 인증 패턴

**해결 NFR**: NFR-S-02 (JWT), NFR-S-03 (API 접근 제어), NFR-S-04 (매장 격리)

### 구현 설계
```python
# core/dependencies.py

# 1. DB 세션 의존성
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 2. 테이블 인증 의존성
class TableAuth(BaseModel):
    table_id: int
    store_id: int
    session_id: str

def get_table_auth(
    authorization: str = Header(..., alias="Authorization")
) -> TableAuth:
    token = authorization.removeprefix("Bearer ")
    try:
        payload = jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "table":
            raise HTTPException(401)
        return TableAuth(**payload)
    except JWTError:
        raise HTTPException(401, "유효하지 않은 인증입니다")

# 3. 관리자 인증 의존성
class AdminAuth(BaseModel):
    admin_id: int
    store_id: int

def get_admin_auth(
    authorization: str = Header(..., alias="Authorization")
) -> AdminAuth:
    token = authorization.removeprefix("Bearer ")
    try:
        payload = jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "admin":
            raise HTTPException(401)
        return AdminAuth(**payload)
    except ExpiredSignatureError:
        raise HTTPException(401, "세션이 만료되었습니다")
    except JWTError:
        raise HTTPException(401, "유효하지 않은 인증입니다")

# 4. SSEManager 의존성
def get_sse_manager(request: Request) -> SSEManager:
    return request.app.state.sse_manager
```

**핵심 설계 결정**:
- `type` 클레임으로 테이블 토큰과 관리자 토큰 구분 → 역할 오용 방지
- 만료 에러와 일반 JWT 에러를 분리하여 다른 메시지 제공
- 모든 서비스 메서드에 `store_id` 전달 → 데이터 격리 보장

---

## Pattern 3: Secure Hash Pattern (bcrypt)

**해결 NFR**: NFR-S-01 (비밀번호 해싱)

### 구현 설계
```python
# core/security.py
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

**핵심 설계 결정**:
- `deprecated="auto"`: 향후 bcrypt 버전 업 시 자동 마이그레이션
- `verify()`는 timing-safe 비교로 timing attack 방지

---

## Pattern 4: SQLite WAL + Connection 설정 패턴

**해결 NFR**: NFR-P-04 (SQLite 동시성), NFR-A-03 (DB 초기화)

### 구현 설계
```python
# database.py
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = "sqlite:///./table_order.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # FastAPI 멀티스레드 대응
    echo=False  # 개발 시 True로 변경 가능
)

# WAL 모드 활성화 (읽기/쓰기 동시성 향상)
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")  # FK 제약 활성화
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def init_db():
    Base.metadata.create_all(bind=engine)
```

**핵심 설계 결정**:
- `check_same_thread=False`: SQLAlchemy가 스레드 안전하게 세션 관리
- `PRAGMA foreign_keys=ON`: SQLite 기본값은 FK 비활성화, 명시적 활성화
- WAL 모드: 읽기 쿼리와 쓰기 쿼리 동시 실행 가능 (SSE + 주문 생성 동시)

---

## Pattern 5: Consistent Error Response Pattern

**해결 NFR**: NFR-A-02 (에러 응답 명확성)

### 응답 형식 표준화
```python
# 모든 HTTPException은 동일 형식으로 응답
# FastAPI 기본: {"detail": "에러 메시지"}

# 사용 예시
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="주문을 찾을 수 없습니다"
)

raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="주문 항목이 없습니다"
)

raise HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="자격 증명이 올바르지 않습니다"
)
```

### HTTP 상태 코드 매핑
| 상황 | 상태 코드 | 메시지 예시 |
|---|---|---|
| 인증 실패 | 401 | "자격 증명이 올바르지 않습니다" |
| 세션 만료 | 401 | "세션이 만료되었습니다" |
| 권한 없음 | 403 | "접근 권한이 없습니다" |
| 리소스 없음 | 404 | "주문을 찾을 수 없습니다" |
| 잘못된 요청 | 400 | "주문 항목이 없습니다" |
| 잘못된 상태 전환 | 400 | "유효하지 않은 상태 전환입니다" |
| 서버 오류 | 500 | FastAPI 기본 처리 |

---

## Pattern 6: Scoped Authorization Pattern

**해결 NFR**: NFR-S-04 (매장 격리)

### 원칙
모든 서비스 메서드는 `store_id`를 첫 번째 필터로 적용:

```python
# 올바른 패턴
order = db.query(Order).filter(
    Order.id == order_id,
    Order.store_id == store_id  # 반드시 포함
).first()

# 잘못된 패턴 (store_id 없음 → 다른 매장 데이터 접근 가능)
order = db.query(Order).filter(Order.id == order_id).first()
```

**구현 원칙**:
- Router에서 인증 토큰의 `store_id`를 추출
- Service 메서드 시그니처에 `store_id` 파라미터 필수 포함
- 모든 DB 쿼리에 `store_id` 조건 추가
