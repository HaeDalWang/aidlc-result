# 도메인 엔티티 (Domain Entities) — admin-frontend

> 관리자 프론트엔드는 순수 클라이언트 앱이므로 서버 측 DB 모델이 없습니다.
> 이 파일은 클라이언트 내부 상태(State)와 API 응답 데이터 구조를 정의합니다.

---

## 클라이언트 상태 (In-Memory State)

### AppState (전역)
```javascript
{
  auth: {
    token: string | null,       // JWT 토큰 (localStorage 동기화)
    adminId: number | null,
    storeId: number | null,
    isAuthenticated: boolean
  },
  tables: TableSummary[],       // 대시보드 테이블 목록
  sseConnected: boolean,        // SSE 연결 상태
  filter: {
    selectedTableId: number | null  // 테이블 필터
  }
}
```

### TableSummary (대시보드 카드)
```javascript
{
  tableId: number,
  tableNumber: number,
  totalAmount: number,          // 현재 세션 총 주문액
  orders: Order[],              // 현재 세션 주문 목록
  isHighlighted: boolean,       // 신규 주문 강조 여부
  highlightTimer: number | null // 강조 해제 타이머 ID
}
```

### Order
```javascript
{
  id: number,
  tableId: number,
  sessionId: string,
  totalAmount: number,
  status: 'PENDING' | 'PREPARING' | 'COMPLETED',
  createdAt: string,            // ISO 8601
  items: OrderItem[]
}
```

### OrderItem
```javascript
{
  id: number,
  menuName: string,
  quantity: number,
  unitPrice: number
}
```

### OrderHistory (과거 이력 모달)
```javascript
{
  sessionId: string,
  completedAt: string,
  orders: OrderHistoryRecord[]
}

OrderHistoryRecord {
  id: number,
  originalOrderId: number | null,
  items: { menuName, quantity, unitPrice }[],
  totalAmount: number,
  orderStatus: string,
  orderedAt: string,
  completedAt: string
}
```

---

## localStorage 저장 항목

| 키 | 값 | 설명 |
|---|---|---|
| `admin_token` | JWT 문자열 | 관리자 인증 토큰 (16시간 만료) |

---

## SSE 이벤트 타입

| 이벤트 | 페이로드 | 처리 |
|---|---|---|
| `new_order` | `{ order: Order }` | 해당 테이블 카드에 주문 추가, 강조 표시 |
| `order_updated` | `{ order_id, status, table_id }` | 해당 주문 상태 업데이트 |
| `order_deleted` | `{ order_id, table_id }` | 해당 주문 제거, 총액 재계산 |
| `session_completed` | `{ table_id, new_session_id }` | 테이블 카드 초기화 |
