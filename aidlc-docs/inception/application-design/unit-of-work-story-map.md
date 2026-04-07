# 스토리-Unit 매핑 (Unit of Work Story Map)

## 전체 스토리 배정 현황

| 스토리 ID | 스토리 제목 | 배정 Unit | 관련 컴포넌트 |
|---|---|---|---|
| US-001 | 태블릿 초기 설정 | backend-api + customer-frontend | AuthRouter, CustomerAuth |
| US-002 | 테이블 자동 로그인 | backend-api + customer-frontend | AuthRouter, CustomerAuth |
| US-003 | 카테고리별 메뉴 탐색 | backend-api + customer-frontend | MenuRouter, MenuView |
| US-004 | 메뉴 상세 정보 확인 | customer-frontend | MenuView |
| US-005 | 장바구니 추가 및 수량 변경 | customer-frontend | CartManager |
| US-006 | 장바구니 데이터 영속성 | customer-frontend | CartManager |
| US-007 | 주문 확정 및 제출 | backend-api + customer-frontend | OrderRouter, OrderView |
| US-008 | 주문 실패 처리 | customer-frontend | OrderView |
| US-009 | 현재 세션 주문 내역 확인 | backend-api + customer-frontend | OrderRouter, OrderHistoryView, SSERouter |
| US-010 | 새 고객의 깨끗한 시작 | backend-api + customer-frontend | TableService, OrderHistoryView |
| US-011 | 관리자 로그인 | backend-api + admin-frontend | AuthRouter, AdminAuth |
| US-012 | 관리자 세션 유지 및 자동 로그아웃 | admin-frontend | AdminAuth |
| US-013 | 신규 주문 실시간 확인 | backend-api + admin-frontend | SSERouter, DashboardView, AdminSSEClient |
| US-014 | 주문 상세 조회 및 상태 변경 | backend-api + admin-frontend | OrderRouter, OrderDetailModal |
| US-015 | 주문 삭제 (직권 수정) | backend-api + admin-frontend | OrderRouter, OrderDetailModal |
| US-016 | 테이블 이용 완료 처리 | backend-api + admin-frontend | TableRouter, TableManager |
| US-017 | 이용 완료 후 고객 화면 초기화 | backend-api + customer-frontend | TableService, SSERouter |
| US-018 | 과거 주문 내역 조회 | backend-api + admin-frontend | TableRouter, PastHistoryModal |

**전체 18개 스토리 — 누락 없음**

---

## Unit별 스토리 목록

### Unit 1: backend-api

**구현해야 할 스토리 (API 구현 관점):**

| 스토리 ID | 기능 | 주요 구현 |
|---|---|---|
| US-001 | 테이블 초기 설정 API | `POST /api/auth/table-login` 자격 증명 검증 |
| US-002 | 자동 로그인 API | 동일 엔드포인트, 세션 토큰 반환 |
| US-003 | 메뉴 목록 API | `GET /api/menus` 카테고리별 그룹화 |
| US-007 | 주문 생성 API | `POST /api/orders`, SSE 이벤트 발행 |
| US-009 | 주문 내역 API | `GET /api/orders/table/{id}` 세션 필터 |
| US-010 | 세션 분리 로직 | session_id 기반 쿼리 필터 |
| US-011 | 관리자 로그인 API | `POST /api/auth/admin-login`, JWT 발급 |
| US-013 | SSE 스트림 | `GET /api/sse/admin`, 신규 주문 이벤트 |
| US-014 | 주문 상태 변경 API | `PATCH /api/orders/{id}/status` |
| US-015 | 주문 삭제 API | `DELETE /api/orders/{id}` |
| US-016 | 이용 완료 API | `POST /api/tables/{id}/complete` |
| US-017 | 세션 종료 + SSE | TableService, SSE session_completed 발행 |
| US-018 | 과거 내역 API | `GET /api/tables/{id}/history` |

---

### Unit 2: customer-frontend

**구현해야 할 스토리 (UI 관점):**

| 스토리 ID | 기능 | 주요 구현 |
|---|---|---|
| US-001 | 초기 설정 화면 | 매장ID/테이블번호/비밀번호 입력 폼 |
| US-002 | 자동 로그인 | localStorage 확인 → API 호출 → 성공 시 메뉴 화면 |
| US-003 | 메뉴 목록 화면 | 카테고리 탭 + 메뉴 카드 그리드 |
| US-004 | 메뉴 상세 | 상세 정보 모달/팝업 |
| US-005 | 장바구니 UI | 추가/수량 변경/삭제/총액 표시 |
| US-006 | 장바구니 영속성 | localStorage 저장/복원 |
| US-007 | 주문 확인 화면 | 주문 목록 확인 + "주문하기" 버튼 |
| US-008 | 주문 실패 UI | 에러 메시지 + 재시도 안내 |
| US-009 | 주문 내역 화면 | 현재 세션 주문 목록 + SSE 실시간 상태 |
| US-010 | 세션 초기화 반응 | SSE session_completed 수신 시 주문 내역 비우기 |
| US-017 | SSE 수신 처리 | `GET /api/sse/table/{id}` 구독, 상태 업데이트 반영 |

---

### Unit 3: admin-frontend

**구현해야 할 스토리 (UI 관점):**

| 스토리 ID | 기능 | 주요 구현 |
|---|---|---|
| US-011 | 로그인 화면 | 매장ID/사용자명/비밀번호 입력 폼, JWT 저장 |
| US-012 | 세션 관리 | 토큰 만료 감지, 자동 로그아웃, 새로고침 유지 |
| US-013 | 실시간 대시보드 | SSE 구독, 테이블 카드 그리드, 신규 주문 강조 |
| US-014 | 주문 상세 모달 | 전체 메뉴 목록 + 상태 변경 버튼 |
| US-015 | 주문 삭제 | 삭제 버튼 + 확인 팝업 + 총액 재계산 반영 |
| US-016 | 이용 완료 버튼 | 확인 팝업 + API 호출 + 카드 초기화 |
| US-018 | 과거 내역 모달 | 날짜 필터 + 이력 목록 표시 |

---

## 스토리 커버리지 검증

- **Total Stories**: 18
- **Unit 1 (backend-api)**: 13개 스토리의 서버 측 구현
- **Unit 2 (customer-frontend)**: 11개 스토리의 고객 UI 구현
- **Unit 3 (admin-frontend)**: 7개 스토리의 관리자 UI 구현
- **미배정 스토리**: 0개 (전체 커버)

> 일부 스토리(US-001, US-002 등)는 backend-api + frontend 양쪽 모두에 걸쳐 있으며, 이는 정상적인 Full-Stack 스토리입니다.
