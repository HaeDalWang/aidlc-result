# 서비스 레이어 설계 (Services)

## 서비스 아키텍처

```
[Routers] → [Services] → [Models/DB]
                ↓
         [SSEManager] → [SSE Clients]
```

- **Routers**: HTTP 요청 수신, 인증 검증, DTO 변환, 서비스 호출
- **Services**: 비즈니스 로직 처리, DB 조작, SSE 이벤트 발행
- **SSEManager**: 실시간 이벤트 브로드캐스트 (서비스와 독립적으로 동작)

---

## 서비스 상세

### AuthService

**역할**: 인증/인가 전담 서비스

**오케스트레이션 흐름**:

```
테이블 로그인:
  Router → AuthService.verify_table_credentials()
         → DB: Store 조회 (store_identifier)
         → DB: Table 조회 (store_id + table_number)
         → 비밀번호 검증 (plain text 비교)
         → 세션 토큰 생성
         → TableLoginResponse 반환

관리자 로그인:
  Router → AuthService.verify_admin_credentials()
         → DB: Store 조회 (store_identifier)
         → DB: Admin 조회 (store_id + username)
         → bcrypt 비밀번호 검증
         → JWT 토큰 생성 (16시간 만료)
         → AdminLoginResponse 반환
```

**의존성**: DB Session, passlib(bcrypt), python-jose(JWT)

---

### MenuService

**역할**: 메뉴 데이터 조회 전담 서비스 (읽기 전용)

**오케스트레이션 흐름**:

```
메뉴 목록 조회:
  Router → MenuService.get_menus_by_category()
         → DB: Category 목록 조회 (store_id, order 정렬)
         → DB: Menu 목록 조회 (store_id, order 정렬)
         → Python: 카테고리별 그룹화
         → CategoryWithMenus 리스트 반환
```

**의존성**: DB Session

---

### OrderService

**역할**: 주문 핵심 비즈니스 로직 + SSE 이벤트 발행

**오케스트레이션 흐름**:

```
주문 생성:
  Router → OrderService.create_order()
         → DB: Order 레코드 생성 (table_id, session_id, total_amount, status=PENDING)
         → DB: OrderItem 레코드 생성 (주문 항목별)
         → SSEManager.publish_to_admin(store_id, new_order_event)
         → OrderResponse 반환

주문 상태 변경:
  Router → OrderService.update_order_status()
         → DB: Order.status 업데이트
         → SSEManager.publish_to_admin(store_id, order_updated_event)
         → SSEManager.publish_to_table(table_id, order_updated_event)
         → OrderResponse 반환

주문 삭제:
  Router → OrderService.delete_order()
         → DB: Order 삭제 (OrderItem cascade 삭제)
         → Python: 테이블 현재 세션 총 금액 재계산
         → SSEManager.publish_to_admin(store_id, order_deleted_event)
         → DeleteResponse 반환
```

**의존성**: DB Session, SSEManager

---

### TableService

**역할**: 테이블 세션 생명주기 관리

**오케스트레이션 흐름**:

```
테이블 이용 완료:
  Router → TableService.complete_table_session()
         → DB: 현재 세션 Order 목록 조회
         → DB: OrderHistory 레코드 생성 (세션별 그룹)
         → DB: OrderHistoryItem 레코드 생성
         → DB: Order 레코드 삭제 (현재 세션)
         → DB: Table.session_id 새 UUID로 업데이트
         → SSEManager.publish_to_admin(store_id, session_completed_event)
         → SessionCompleteResult 반환

과거 내역 조회:
  Router → TableService.get_past_order_history()
         → DB: OrderHistory 조회 (table_id + 날짜 필터)
         → DB: OrderHistoryItem 조회 (JOIN)
         → Python: 세션별 그룹화, 시간 역순 정렬
         → OrderHistoryGroup 리스트 반환
```

**의존성**: DB Session, SSEManager, uuid

---

### SSEManager (Singleton Service)

**역할**: 비동기 SSE 이벤트 브로드캐스트 관리

**구조**:

```python
class SSEManager:
    admin_queues: dict[int, list[asyncio.Queue]]   # store_id → [Queue, ...]
    table_queues: dict[int, list[asyncio.Queue]]   # table_id → [Queue, ...]
```

**이벤트 흐름**:

```
이벤트 발행:
  OrderService → SSEManager.publish_to_admin(store_id, event)
              → admin_queues[store_id] 모든 큐에 put_nowait(event)

SSE 스트림:
  SSERouter → SSEManager.subscribe_admin(store_id)
           → 새 Queue 생성, admin_queues[store_id]에 추가
           → async generator: queue.get() → yield SSE format
           → 연결 종료 시: admin_queues[store_id]에서 제거
```

**SSE 이벤트 포맷**:

```
data: {"type": "new_order", "order": {...}}

data: {"type": "order_updated", "order_id": 1, "status": "PREPARING"}

data: {"type": "order_deleted", "order_id": 1, "table_id": 2}

data: {"type": "session_completed", "table_id": 2}
```

**의존성**: asyncio (내장), 싱글톤으로 FastAPI app state에 등록

---

## FastAPI 앱 구조

```python
# main.py
app = FastAPI()

# 정적 파일 서빙
app.mount("/customer", StaticFiles(directory="static/customer"), name="customer")
app.mount("/admin", StaticFiles(directory="static/admin"), name="admin")

# 라우터 등록
app.include_router(auth_router, prefix="/api")
app.include_router(menu_router, prefix="/api")
app.include_router(order_router, prefix="/api")
app.include_router(table_router, prefix="/api")
app.include_router(sse_router, prefix="/api")

# SSEManager 싱글톤 등록
@app.on_event("startup")
async def startup():
    app.state.sse_manager = SSEManager()
    init_db()
```
