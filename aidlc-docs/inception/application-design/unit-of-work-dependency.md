# 작업 단위 의존성 (Unit of Work Dependencies)

## 의존성 매트릭스

| Unit | backend-api | customer-frontend | admin-frontend |
|---|---|---|---|
| **backend-api** | — | 제공됨 | 제공됨 |
| **customer-frontend** | 필수 의존 | — | 독립 |
| **admin-frontend** | 필수 의존 | 독립 | — |

- **필수 의존**: 해당 Unit이 완성되어야 개발/테스트 가능
- **독립**: 서로 영향 없음
- **제공됨**: 다른 Unit에 API/서비스를 제공

---

## 개발 순서 (Critical Path)

```
[Unit 1: backend-api] ──→ [Unit 2: customer-frontend]
                     └──→ [Unit 3: admin-frontend]
```

**Unit 1이 먼저 완성되어야 하는 이유:**
- Unit 2, 3 모두 백엔드 API 엔드포인트에 의존
- SSE 스트림 엔드포인트가 없으면 실시간 기능 테스트 불가
- 인증 토큰 구조가 확정되어야 프론트엔드 auth 모듈 구현 가능

**Unit 2, 3은 병렬 개발 가능:**
- customer-frontend와 admin-frontend는 서로 독립적
- 단, 동일한 백엔드 API를 공유하므로 API 스펙 변경 시 양쪽 영향

---

## Unit별 공유 자원

### 공유 API 엔드포인트 (둘 다 사용)

| 엔드포인트 | customer-frontend | admin-frontend |
|---|---|---|
| `GET /api/menus` | O | X |
| `GET /api/categories` | O | X |
| `POST /api/orders` | O | X |
| `GET /api/orders/table/{id}` | O | X |
| `PATCH /api/orders/{id}/status` | X | O |
| `DELETE /api/orders/{id}` | X | O |
| `GET /api/tables` | X | O |
| `POST /api/tables/{id}/complete` | X | O |
| `GET /api/tables/{id}/history` | X | O |
| `GET /api/sse/table/{id}` | O | X |
| `GET /api/sse/admin` | X | O |

### 공유 인증 방식

| Unit | 인증 방식 | 토큰 저장 |
|---|---|---|
| customer-frontend | 테이블 세션 토큰 | localStorage["table_auth"] |
| admin-frontend | JWT (16시간) | localStorage["admin_token"] |

---

## 통합 지점 (Integration Points)

### IP-1: 주문 생성 → 관리자 실시간 표시
```
customer-frontend → POST /api/orders → backend-api
                                          → SSE → admin-frontend
```
- **의존 방향**: customer-frontend → backend-api → admin-frontend (간접)
- **테스트**: Unit 1 + Unit 2 + Unit 3 모두 필요

### IP-2: 주문 상태 변경 → 고객 실시간 반영
```
admin-frontend → PATCH /api/orders/{id}/status → backend-api
                                                    → SSE → customer-frontend
```
- **의존 방향**: admin-frontend → backend-api → customer-frontend (간접)
- **테스트**: Unit 1 + Unit 3 + Unit 2 모두 필요

### IP-3: 테이블 이용 완료 → 고객 화면 초기화
```
admin-frontend → POST /api/tables/{id}/complete → backend-api
                                                    → SSE → admin-frontend (대시보드 갱신)
```
- **의존 방향**: admin-frontend → backend-api
- **테스트**: Unit 1 + Unit 3 필요

---

## 빌드 및 실행 의존성

```
runtime:
  backend-api: Python 3.11+, FastAPI, uvicorn
  customer-frontend: 브라우저 (빌드 도구 없음)
  admin-frontend: 브라우저 (빌드 도구 없음)

실행 방법:
  uvicorn main:app --reload --port 8000
  → http://localhost:8000/customer/ (고객 앱)
  → http://localhost:8000/admin/    (관리자 앱)
```
