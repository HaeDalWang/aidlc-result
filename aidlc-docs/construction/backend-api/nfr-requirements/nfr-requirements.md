# 비기능 요구사항 (NFR Requirements) — backend-api

## 시스템 규모 기준

| 항목 | 목표값 |
|---|---|
| 최대 테이블 수 | 50개 |
| 최대 동시 사용자 | 100명 |
| 최대 동시 SSE 연결 | 100개 (관리자 + 고객 합산) |
| 배포 환경 | 로컬 개발 (단일 프로세스) |

---

## 성능 요구사항 (Performance)

### NFR-P-01: SSE 이벤트 전달 지연
- **요구사항**: 신규 주문 발생 후 관리자 화면 표시까지 **2초 이내**
- **측정 기준**: POST /api/orders 완료 → 관리자 SSE 이벤트 수신
- **구현 방향**: 주문 DB 저장 완료 후 즉시 SSE 발행 (동기적 publish)

### NFR-P-02: API 응답 시간
- **요구사항**: 일반 조회 API 응답 **1초 이내**
- **적용 범위**: GET /api/menus, GET /api/orders/table/{id}
- **구현 방향**: SQLite 인덱스 설정 (table_id, session_id, store_id)

### NFR-P-03: 동시 SSE 연결
- **요구사항**: 최대 100개 동시 SSE 연결 지원
- **구현 방향**: FastAPI + asyncio 비동기 처리, SSEManager의 asyncio.Queue 기반 구조
- **SQLite 고려**: SSE는 읽기 전용 이벤트 발행이므로 DB 동시성 영향 없음

### NFR-P-04: SQLite 동시 쓰기
- **인식**: SQLite는 쓰기 잠금(Write Lock)이 있어 동시 쓰기에 제한
- **완화 방안**: WAL(Write-Ahead Logging) 모드 활성화 → 읽기/쓰기 동시성 향상
- **허용 범위**: 50테이블 × 중간 주문 빈도 = 허용 범위 내

---

## 가용성 요구사항 (Availability)

### NFR-A-01: SSE 재연결
- **요구사항**: SSE 연결 끊김 시 클라이언트 자동 재연결
- **구현 방향**: 클라이언트 측 EventSource API의 자동 재연결 활용 (브라우저 기본 동작)
- **서버 측**: 연결 끊김 시 SSEManager에서 구독자 큐 정리

### NFR-A-02: 오류 응답 명확성
- **요구사항**: 주문 처리 오류 시 사용자에게 명확한 에러 메시지
- **구현 방향**: HTTP 상태 코드 + 한국어 에러 메시지 JSON 응답
- **응답 포맷**: `{"detail": "에러 메시지"}`

### NFR-A-03: DB 초기화 자동화
- **요구사항**: 서버 시작 시 DB 테이블 자동 생성
- **구현 방향**: `startup` 이벤트에서 `Base.metadata.create_all()` 실행

---

## 보안 요구사항 (Security)

### NFR-S-01: 비밀번호 해싱
- **요구사항**: 관리자 비밀번호 bcrypt 해싱 저장
- **구현**: passlib[bcrypt] 라이브러리 사용
- **비용 인수**: bcrypt rounds=12 (기본값)
- **적용 대상**: Admin.password_hash 필드만 (테이블 비밀번호는 plain text)

### NFR-S-02: JWT 인증
- **요구사항**: 관리자 JWT 토큰 16시간 만료
- **구현**: python-jose[cryptography] 라이브러리
- **알고리즘**: HS256
- **비밀키**: 환경변수 `JWT_SECRET_KEY` (개발 환경: 하드코딩 허용)
- **만료 처리**: 만료 토큰 → 401 응답

### NFR-S-03: API 접근 제어
- **관리자 전용 API**: JWT 검증 Depends 적용
  - PATCH /api/orders/{id}/status
  - DELETE /api/orders/{id}
  - GET /api/tables
  - POST /api/tables/{id}/complete
  - GET /api/tables/{id}/history
  - GET /api/sse/admin
- **테이블 인증 API**: 테이블 토큰 검증 Depends 적용
  - GET /api/menus
  - POST /api/orders
  - GET /api/orders/table/{id}
  - GET /api/sse/table/{id}

### NFR-S-04: 매장 격리
- **요구사항**: 인증 토큰의 store_id 범위 내 데이터만 접근
- **구현**: 모든 서비스 메서드에 store_id 필터 적용

### NFR-S-05: CORS 설정
- **개발 환경**: 로컬이므로 모든 origin 허용 (`*`)
- **구현**: FastAPI CORSMiddleware

---

## 신뢰성 요구사항 (Reliability)

### NFR-R-01: 트랜잭션 원자성
- **요구사항**: 주문 생성 시 Order + OrderItem 원자적 처리
- **구현**: SQLAlchemy 세션 트랜잭션 (commit/rollback)
- **실패 시**: rollback 후 500 응답, 장바구니 데이터 보존

### NFR-R-02: SSE 구독자 오류 격리
- **요구사항**: 특정 구독자 오류가 다른 구독자에 영향 없음
- **구현**: 개별 구독자 큐의 put_nowait() 예외 catch 후 해당 구독자만 제거

### NFR-R-03: DB 파일 경로 설정
- **구현**: `table_order.db` (프로젝트 루트)
- **개발 편의**: 프로젝트 루트에 생성되어 쉽게 찾을 수 있음

---

## 유지보수성 요구사항 (Maintainability)

### NFR-M-01: 시드 데이터 재실행 가능
- **요구사항**: seed.py를 여러 번 실행해도 중복 생성 없음
- **구현**: `get_or_create` 패턴 또는 `INSERT OR IGNORE`

### NFR-M-02: 환경 설정
- **개발 환경**: 모든 설정을 코드 내 기본값으로 설정 (별도 .env 불필요)
- **설정 항목**: DB URL, JWT Secret, CORS origins

### NFR-M-03: 로깅
- **개발 환경**: uvicorn 기본 로그 + FastAPI 에러 로그
- **수준**: INFO (요청/응답), ERROR (예외)
