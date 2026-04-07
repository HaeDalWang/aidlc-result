# 비즈니스 규칙 (Business Rules) — backend-api

## 인증 규칙

### BR-AUTH-01: 테이블 인증 실패 메시지 통일
- 매장 없음 / 테이블 없음 / 비밀번호 불일치 → 모두 동일한 401 응답
- **이유**: 공격자가 매장/테이블 존재 여부를 추측하지 못하도록

### BR-AUTH-02: 관리자 인증 실패 메시지 통일
- 매장 없음 / 관리자 없음 / 비밀번호 불일치 → "자격 증명이 올바르지 않습니다" (동일 메시지)
- **이유**: 사용자 열거 공격(User Enumeration) 방지

### BR-AUTH-03: JWT 만료 처리
- 만료된 JWT → 401 "세션이 만료되었습니다"
- 클라이언트는 로그인 화면으로 리다이렉트

### BR-AUTH-04: 테이블 토큰 세션 동기화
- 테이블 토큰의 session_id와 Table.current_session_id가 다른 경우: 주문 생성 거부 (409 또는 401)
- **이유**: 이용 완료 후 갱신된 session_id로 이전 토큰 재사용 방지 (선택적 엄격 검증)

---

## 주문 규칙

### BR-ORD-01: 빈 주문 금지
- items가 빈 배열이면 주문 생성 거부 (400)

### BR-ORD-02: 수량 최소값
- item.quantity < 1 이면 거부 (400)

### BR-ORD-03: 가격 최소값
- item.unit_price < 0 이면 거부 (400)

### BR-ORD-04: 총 금액 서버 계산
- 클라이언트가 전달한 총 금액은 사용하지 않음
- 서버에서 sum(quantity * unit_price)로 직접 계산
- **이유**: 클라이언트 조작 방지

### BR-ORD-05: 메뉴 정보 스냅샷
- OrderItem.menu_name, unit_price는 주문 시점 값을 저장
- 이후 메뉴 수정/삭제와 무관하게 주문 금액 불변
- **이유**: 이력 데이터 정합성 보장

### BR-ORD-06: 주문 상태 단방향 전환
- PENDING → PREPARING 만 허용
- PREPARING → COMPLETED 만 허용
- COMPLETED → 변경 불가 (400)
- 역방향 전환 (예: PREPARING → PENDING) 불허
- **이유**: 주문 처리 프로세스의 일관성 유지

### BR-ORD-07: 주문 삭제 권한
- 관리자만 주문 삭제 가능
- 자신의 매장(store_id 일치) 주문만 삭제 가능
- 상태 무관하게 삭제 가능 (직권 수정)

---

## 세션 규칙

### BR-SES-01: 세션 ID는 서버가 관리
- Table.current_session_id는 서버(UUID)가 생성
- 클라이언트가 session_id를 임의 지정 불가
- 주문 생성 시 테이블 토큰의 session_id를 자동 사용

### BR-SES-02: 이용 완료 시 모든 현재 주문 이력화
- 이용 완료 처리 시 현재 session_id의 모든 Order → OrderHistory로 이동
- COMPLETED 상태 주문도 포함 (완료된 주문도 이력 보존)

### BR-SES-03: 이용 완료 후 즉시 새 세션 시작
- 이용 완료 → 즉시 새 UUID session_id 생성
- 새 고객의 첫 주문은 새 session_id로 추적됨
- 별도의 "세션 시작" API 없음 (이용 완료 시 자동으로 다음 세션 준비)

### BR-SES-04: 현재 주문 조회는 session_id 기준
- GET /api/orders/table/{id}는 Table.current_session_id와 동일한 session_id의 주문만 반환
- 이전 세션 주문은 OrderHistory에서만 조회 가능

---

## 메뉴 규칙

### BR-MENU-01: 비가용 메뉴 필터링
- is_available=False 메뉴는 고객 메뉴 조회에서 제외

### BR-MENU-02: 정렬 순서
- 카테고리: sort_order ASC
- 메뉴: sort_order ASC (카테고리 내)

---

## SSE 규칙

### BR-SSE-01: 이벤트 타겟 범위
- new_order → 해당 store의 관리자 구독자 전체
- order_updated → 해당 store의 관리자 + 해당 table의 고객 구독자
- order_deleted → 해당 store의 관리자 구독자 전체
- session_completed → 해당 store의 관리자 구독자 전체

### BR-SSE-02: SSE 연결 오류 무시
- 구독자 큐에 이벤트 전달 실패 시 해당 구독자 제거 (Silent fail)
- 다른 구독자에게는 계속 전달

### BR-SSE-03: Keep-alive
- 30초마다 빈 코멘트(`: ping`) 전송으로 연결 유지

---

## 데이터 접근 규칙

### BR-DATA-01: 매장 격리
- 모든 조회/수정은 현재 인증된 store_id 범위 내로 제한
- 다른 매장 데이터 접근 불가

### BR-DATA-02: 관리자 API 보호
- 주문 상태 변경, 삭제, 테이블 관리: 관리자 JWT 필수
- 테이블 인증 토큰으로는 관리자 API 접근 불가

---

## 입력 검증 규칙

### BR-VAL-01: store_identifier 형식
- 영문 소문자, 숫자, 하이픈만 허용 (최대 50자)

### BR-VAL-02: username 형식
- 영문자, 숫자, 언더스코어 (최대 50자)

### BR-VAL-03: 날짜 범위 (과거 내역 조회)
- date_from <= date_to (역순이면 400)
- 미래 날짜 허용 (조회 결과가 없을 뿐)
