# Domain Entities — customer-frontend

## 개요

customer-frontend의 도메인 엔티티는 JavaScript 객체로 관리됩니다.
localStorage 저장 대상과 메모리 전용 데이터를 구분합니다.

---

## 1. TableCredentials (localStorage 저장)

테이블 인증 정보. 초기 설정 후 localStorage에 영구 저장.

```javascript
// localStorage key: 'tableCredentials'
{
  storeId: string,       // 매장 식별자
  tableNumber: number,   // 테이블 번호
  password: string       // 테이블 비밀번호
}
```

---

## 2. AuthSession (localStorage 저장)

로그인 후 서버로부터 수신하는 세션 정보.

```javascript
// localStorage key: 'authSession'
{
  token: string,         // JWT 토큰 (API 요청 Authorization 헤더에 사용)
  tableId: number,       // 서버에서 확인한 테이블 ID
  sessionId: string,     // 현재 테이블 세션 ID (주문 필터링 기준)
  storeName: string      // 매장명 (헤더 표시용)
}
```

---

## 3. MenuItem (메모리 전용)

서버 API에서 조회한 메뉴 항목.

```javascript
{
  id: number,            // 메뉴 ID
  name: string,          // 메뉴명
  category: string,      // 카테고리명
  price: number,         // 가격 (원 단위 정수)
  description: string,   // 메뉴 설명 (nullable)
  imageUrl: string       // 이미지 URL (nullable)
}
```

---

## 4. Category (메모리 전용)

메뉴 목록에서 추출한 카테고리. MenuItem.category 값의 고유 목록.

```javascript
{
  name: string           // 카테고리명 (탭 텍스트 및 섹션 앵커로 사용)
}
```

---

## 5. CartItem (localStorage 저장)

장바구니 항목. 수량 변경 시 즉시 localStorage 동기화.

```javascript
// localStorage key: 'cartItems'
// 형태: CartItem[]
{
  menuId: number,        // 메뉴 ID (중복 추가 시 수량 증가 기준)
  menuName: string,      // 메뉴명 (API 재조회 없이 표시)
  unitPrice: number,     // 단가
  quantity: number       // 수량 (최소 1, 0이 되면 배열에서 제거)
}
```

**파생 값**: `subtotal = unitPrice * quantity`

---

## 6. Order (메모리 전용)

서버에서 조회한 주문 정보. 주문 내역 화면에서 렌더링.

```javascript
{
  id: number,            // 주문 ID
  tableId: number,       // 테이블 ID
  sessionId: string,     // 세션 ID
  status: string,        // 'pending' | 'preparing' | 'completed'
  totalAmount: number,   // 총 금액
  createdAt: string,     // ISO 8601 타임스탬프
  items: OrderItem[]     // 주문 항목 목록
}
```

---

## 7. OrderItem (메모리 전용, Order에 내포)

주문에 포함된 개별 메뉴 항목.

```javascript
{
  menuId: number,        // 메뉴 ID
  menuName: string,      // 메뉴명
  quantity: number,      // 주문 수량
  unitPrice: number      // 주문 시점 단가
}
```

---

## 8. OrderStatusUpdate (SSE 이벤트 데이터)

SSE `order_status_updated` 이벤트 페이로드.

```javascript
{
  orderId: number,       // 업데이트할 주문 ID
  status: string         // 새 상태: 'pending' | 'preparing' | 'completed'
}
```

---

## 9. AppState (메모리 전용 — AppController 관리)

앱 전역 런타임 상태.

```javascript
{
  currentTab: string,           // 'menu' | 'cart' | 'orders'
  isAuthenticated: boolean,     // 로그인 완료 여부
  menus: MenuItem[],            // 조회된 메뉴 목록
  cartItems: CartItem[],        // 장바구니 (localStorage와 동기화)
  orders: Order[],              // 현재 세션 주문 목록
  sseConnected: boolean,        // SSE 연결 상태
  sseReconnectCount: number     // 재연결 시도 횟수
}
```

---

## 엔티티 관계 요약

```
TableCredentials (localStorage)
  +-- 로그인 API 호출 자격증명

AuthSession (localStorage)
  +-- token --> API 요청 인증
  +-- tableId --> Order 조회 기준
  +-- sessionId --> Order 세션 필터 기준

MenuItem (memory)
  +-- category --> Category 목록 파생
  +-- id --> CartItem.menuId 참조

CartItem (localStorage)
  +-- menuId --> MenuItem.id 참조
  +-- quantity --> 주문 payload 생성

Order (memory)
  +-- items: OrderItem[]
  +-- status --> SSE OrderStatusUpdate로 갱신
```
