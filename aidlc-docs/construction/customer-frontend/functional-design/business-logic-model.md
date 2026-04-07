# Business Logic Model — customer-frontend

## 개요

customer-frontend는 Vanilla JavaScript SPA로, localStorage 기반 상태 관리와 SSE 실시간 업데이트를 핵심으로 합니다.

---

## 1. 앱 초기화 플로우 (App Bootstrap)

```
앱 시작 (index.html 로드)
  |
  +-- localStorage에서 인증 정보 확인
  |     |
  |     +-- 없음 --> [초기 설정 화면] 표시
  |     |
  |     +-- 있음 --> API POST /api/auth/table-login 호출
  |                   |
  |                   +-- 성공 --> token/sessionId 저장 --> [메뉴 화면] 표시
  |                   |
  |                   +-- 실패 --> 에러 메시지 표시 --> [초기 설정 화면] 표시
```

**결정 사항**: localStorage에 `storeId`, `tableNumber`, `password` 모두 존재할 때만 자동 로그인 시도

---

## 2. 인증 플로우 (Auth Flow)

### 2-1. 초기 설정 (US-001)
```
매장ID + 테이블번호 + 비밀번호 입력
  |
  +-- 입력값 유효성 검증 (모두 필수)
  |
  +-- POST /api/auth/table-login
  |
  +-- 성공 --> localStorage 저장 (storeId, tableNumber, password, token, sessionId)
  |         --> [메뉴 화면] 이동
  |
  +-- 실패 --> 에러 메시지 표시 (입력 유지)
```

### 2-2. 자동 로그인 (US-002)
```
페이지 로드
  |
  +-- localStorage.getItem('tableCredentials')
  |
  +-- 존재 --> 자동으로 POST /api/auth/table-login 호출
  |         --> 성공: [메뉴 화면] / 실패: [초기 설정 화면]
  |
  +-- 없음 --> [초기 설정 화면]
```

### 2-3. 설정 재진입 (Q1-A)
```
메인 앱 헤더 영역 "설정" 버튼 (작게 표시)
  |
  +-- localStorage 인증 정보 삭제
  +-- [초기 설정 화면] 표시
```

---

## 3. 메뉴 조회 플로우 (Menu Flow)

### 3-1. 메뉴 목록 로드 (US-003)
```
[메뉴 화면] 진입
  |
  +-- GET /api/menus 호출
  |
  +-- 응답 처리:
  |     menus = [{ id, name, category, price, description, imageUrl }]
  |
  +-- 카테고리 추출 (중복 제거, 순서 유지)
  |
  +-- 카테고리 탭 렌더링 (상단 수평 탭, Q2-A)
  +-- 메뉴 카드 그리드 렌더링 (카테고리 섹션 단위)
```

### 3-2. 카테고리 탐색 (Q2-A: 스크롤 이동)
```
카테고리 탭 클릭
  |
  +-- 해당 카테고리 섹션으로 scrollIntoView({ behavior: 'smooth' })
  +-- 활성 탭 하이라이트 업데이트
```

### 3-3. 메뉴 상세 (US-004, Q3-A: 모달)
```
메뉴 카드 탭
  |
  +-- 메뉴 상세 모달 표시
  |     - 메뉴명, 가격, 설명, 이미지
  |     - "장바구니 담기" 버튼 (현재 카드 수량 연동)
  |
  +-- 모달 닫기: 배경 클릭 또는 "닫기" 버튼
```

---

## 4. 장바구니 플로우 (Cart Flow)

### 4-1. 수량 변경 (US-005, Q4-A: 카드 직접 +/-)
```
메뉴 카드 "+" 버튼
  |
  +-- CartManager.addItem(menuId, menuName, price)
  +-- 수량 배지 업데이트 (카드에 현재 수량 표시)
  +-- localStorage 동기화
  +-- 하단 장바구니 탭 dot 배지 업데이트 (Q10-C)

메뉴 카드 "-" 버튼
  |
  +-- 수량 > 1: CartManager.decreaseItem(menuId) -> 수량 감소
  +-- 수량 = 1: CartManager.removeItem(menuId) -> 카드에서 배지 제거
  +-- localStorage 동기화
```

### 4-2. 장바구니 화면
```
[장바구니 화면] 진입
  |
  +-- localStorage에서 장바구니 데이터 로드
  +-- 항목 목록: 메뉴명, 단가, 수량 +/-, 소계
  +-- 총 금액 실시간 계산
  +-- "장바구니 비우기" 버튼 → 전체 삭제
  +-- "주문하기" 버튼 (장바구니 비어있으면 비활성화)
```

### 4-3. localStorage 영속성 (US-006)
```
CartManager 상태 변경 시:
  localStorage.setItem('cartItems', JSON.stringify(cartItems))

페이지 로드 시:
  const saved = localStorage.getItem('cartItems')
  if (saved) cartItems = JSON.parse(saved)
```

---

## 5. 주문 플로우 (Order Flow)

### 5-1. 주문 확인 모달 (US-007, Q5-B)
```
"주문하기" 버튼 클릭
  |
  +-- 주문 확인 모달 표시
  |     - 메뉴 목록, 총 금액
  |     - "확인" / "취소" 버튼
  |
  +-- "확인" 클릭 --> POST /api/orders 호출
  |                    payload: { table_id, session_id, items: [...] }
  |
  +-- 성공 --> 장바구니 초기화 --> 토스트 메시지 (Q6-A)
  |         --> 5초 후 [메뉴 화면]으로 이동
  |
  +-- 실패 --> 에러 메시지 표시 (장바구니 유지, Q8 재시도 안내)
```

### 5-2. 주문 성공 토스트 (Q6-A)
```
주문 성공
  |
  +-- 하단 토스트: "주문이 완료되었습니다!" (3초 표시)
  +-- 5초 후 자동으로 [메뉴 화면]으로 이동
```

### 5-3. 주문 실패 (US-008)
```
API 오류
  |
  +-- 네트워크 오류: "네트워크 연결을 확인해 주세요. 장바구니는 유지됩니다."
  +-- 서버 오류: "주문 처리 중 오류가 발생했습니다. 다시 시도해 주세요."
  +-- 장바구니 데이터 유지 (초기화 없음)
```

---

## 6. 주문 내역 플로우 (Order History Flow)

### 6-1. 주문 내역 로드 (US-009)
```
[주문 내역 화면] 진입
  |
  +-- GET /api/orders/table/{tableId} 호출
  |     (현재 세션 필터: session_id 기준)
  |
  +-- 주문 목록 렌더링:
  |     - 주문번호, 주문시각, 메뉴목록, 총금액, 상태
  |
  +-- SSE 연결 시작 (최초 진입 시)
  |     GET /api/sse/table/{tableId}
  |
  +-- 주문 없음: "아직 주문 내역이 없습니다" 메시지
```

### 6-2. SSE 실시간 상태 업데이트 (US-009)
```
SSE 이벤트 수신
  |
  +-- event: order_status_updated
  |     data: { order_id, status }
  |     --> DOM에서 해당 주문 상태 배지 업데이트 (Progress Bar, Q7-B)
  |
  +-- event: session_completed (US-010, US-017)
  |     --> Q9-A 처리:
  |           주문 내역 UI 초기화 (빈 목록)
  |           localStorage 장바구니 초기화
  |           (화면 전환 없음)
```

### 6-3. SSE 재연결 (US-009, Q8-A)
```
SSE 연결 끊김 감지 (onerror)
  |
  +-- reconnectCount < 5:
  |     3초 후 재연결 시도
  |     reconnectCount++
  |
  +-- reconnectCount >= 5:
  |     "실시간 업데이트 연결이 끊겼습니다" 안내 표시
  |     (수동 새로고침 안내)
```

---

## 7. 화면 전환 (Navigation)

```
화면 전환 관리 (AppController):
  |
  +-- showSetupScreen()    --> 초기 설정 화면 표시
  +-- showMainApp()        --> 메인 앱 (탭 + 콘텐츠 영역) 표시
  +-- showTab('menu')      --> 메뉴 화면
  +-- showTab('cart')      --> 장바구니 화면
  +-- showTab('orders')    --> 주문 내역 화면 + SSE 연결
```

**탭 전환 시 SSE 관리**:
- `orders` 탭 진입 시 SSE 연결 (미연결 시)
- SSE는 한 번 연결되면 앱 생명주기 동안 유지

---

## 8. 데이터 흐름 요약

| 데이터 | 저장 위치 | 생명주기 |
|---|---|---|
| 인증 정보 (storeId, tableNumber, password) | localStorage | 수동 삭제 시까지 영구 |
| 세션 토큰 (token) | localStorage | 재로그인 시 갱신 |
| 세션 ID (sessionId) | localStorage + 메모리 | 세션 초기화 시 갱신 |
| 장바구니 (cartItems) | localStorage | 주문 성공 / session_completed 시 초기화 |
| 메뉴 목록 | 메모리 (앱 세션) | 페이지 로드마다 API 재조회 |
| 주문 내역 | 메모리 (앱 세션) | 화면 진입 시 API 조회 + SSE 갱신 |
