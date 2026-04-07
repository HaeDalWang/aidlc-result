# Code Generation Summary — backend-api

## 생성된 파일 목록

### 진입점
| 파일 | 설명 |
|---|---|
| `main.py` | FastAPI 앱, lifespan, 라우터/미들웨어/정적파일 등록 |
| `database.py` | SQLite 연결, WAL 모드, FK 활성화, init_db() |
| `seed.py` | 초기 데이터 생성 (매장/관리자/테이블/메뉴) |
| `requirements.txt` | 의존성 목록 |

### Core 레이어
| 파일 | 설명 |
|---|---|
| `core/config.py` | 환경 설정 (DB URL, JWT, CORS) |
| `core/security.py` | bcrypt 해싱, JWT 생성/검증 |
| `core/sse_manager.py` | asyncio.Queue 기반 SSE Pub/Sub |
| `core/dependencies.py` | FastAPI Depends (DB, 테이블/관리자 인증, SSEManager) |

### 데이터 모델
| 파일 | 모델 |
|---|---|
| `models/store.py` | Store, Admin, Table |
| `models/menu.py` | Category, Menu |
| `models/order.py` | Order, OrderItem, OrderStatus |
| `models/order_history.py` | OrderHistory |

### 스키마 (Pydantic)
| 파일 | 스키마 |
|---|---|
| `schemas/auth.py` | 로그인 요청/응답 |
| `schemas/menu.py` | 메뉴/카테고리 응답 |
| `schemas/order.py` | 주문 요청/응답, 대시보드 요약 |
| `schemas/table.py` | 테이블 정보, 이력 응답 |

### 서비스 레이어
| 파일 | 담당 비즈니스 로직 |
|---|---|
| `services/auth_service.py` | 테이블/관리자 인증, JWT 발급 |
| `services/menu_service.py` | 메뉴 카테고리별 그룹화 조회 |
| `services/order_service.py` | 주문 생성/조회/상태변경/삭제, SSE 발행 |
| `services/table_service.py` | 세션 완료, 이력 조회, 테이블 목록 |

### 라우터
| 파일 | 엔드포인트 |
|---|---|
| `routers/auth.py` | POST /api/auth/table-login, /api/auth/admin-login |
| `routers/menu.py` | GET /api/menus |
| `routers/order.py` | POST/GET/PATCH/DELETE /api/orders/*, GET /api/orders/summary |
| `routers/table.py` | GET /api/tables, POST /api/tables/{id}/complete, GET /api/tables/{id}/history |
| `routers/sse.py` | GET /api/sse/admin, GET /api/sse/table/{id} |

## 실행 방법

```bash
python3 -m pip install -r requirements.txt
python3 seed.py
python3 -m uvicorn main:app --reload --port 8000
```

## 접속 URL
- API 문서: http://localhost:8000/docs
- 고객 앱 (플레이스홀더): http://localhost:8000/customer/
- 관리자 앱 (플레이스홀더): http://localhost:8000/admin/

## 검증 결과
- ✅ `main.py` import 성공
- ✅ `seed.py` 실행 성공 (매장/관리자/테이블5/메뉴9개 생성)
- ✅ 서버 기동 성공 (uvicorn)
- ✅ POST /api/auth/admin-login → JWT 반환 확인
