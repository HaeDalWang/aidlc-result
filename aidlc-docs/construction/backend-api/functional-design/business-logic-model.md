# 비즈니스 로직 모델 (Business Logic Model) — backend-api

## BL-01: 테이블 자동 로그인

### 입력
- store_identifier: str
- table_number: int
- table_password: str

### 처리 흐름
```
1. Store 조회 (identifier → store_id)
   - 없으면: 401 "매장을 찾을 수 없습니다"

2. Table 조회 (store_id + table_number → table)
   - 없으면: 401 "테이블을 찾을 수 없습니다"

3. table.password == table_password 비교
   - 불일치: 401 "비밀번호가 올바르지 않습니다"

4. 세션 토큰 생성:
   payload = {
     "table_id": table.id,
     "store_id": store.id,
     "session_id": table.current_session_id,
     "type": "table"
   }
   token = JWT(payload, expires=never_or_long_term)

5. 반환: { token, table_id, table_number, session_id }
```

### 출력
- 성공: TableLoginResponse
- 실패: HTTP 401

---

## BL-02: 관리자 로그인

### 입력
- store_identifier: str
- username: str
- password: str

### 처리 흐름
```
1. Store 조회 (identifier → store_id)
   - 없으면: 401

2. Admin 조회 (store_id + username → admin)
   - 없으면: 401 "자격 증명이 올바르지 않습니다"

3. bcrypt.verify(password, admin.password_hash)
   - 불일치: 401 (같은 메시지 — 사용자 추측 방지)

4. JWT 토큰 생성 (16시간 만료):
   payload = {
     "admin_id": admin.id,
     "store_id": store.id,
     "type": "admin",
     "exp": now + 16hours
   }

5. 반환: { token, admin_id, store_id }
```

### 출력
- 성공: AdminLoginResponse
- 실패: HTTP 401

---

## BL-03: 메뉴 목록 조회 (카테고리별)

### 입력
- store_id: int (테이블 토큰에서 추출)

### 처리 흐름
```
1. Category 목록 조회 (store_id, ORDER BY sort_order ASC)

2. Menu 목록 조회 (store_id, is_available=True, ORDER BY sort_order ASC)

3. Python에서 카테고리별 그룹화:
   result = []
   for category in categories:
       menus = [m for m in all_menus if m.category_id == category.id]
       result.append({ category, menus })

4. 반환: [{ category_id, category_name, menus: [...] }, ...]
```

---

## BL-04: 주문 생성

### 입력
- table_id: int
- session_id: str (테이블 토큰의 session_id)
- items: [{ menu_id, menu_name, quantity, unit_price }]

### 처리 흐름
```
1. 입력 검증:
   - items가 비어있으면: 400 "주문 항목이 없습니다"
   - 각 item.quantity >= 1 검증
   - 각 item.unit_price >= 0 검증

2. total_amount 계산:
   total = sum(item.quantity * item.unit_price for item in items)

3. Order 레코드 생성:
   order = Order(
     store_id=store_id,
     table_id=table_id,
     session_id=session_id,
     total_amount=total,
     status=PENDING,
     created_at=now
   )
   db.add(order)

4. OrderItem 레코드 생성 (각 항목):
   for item in items:
     order_item = OrderItem(
       order_id=order.id,
       menu_name=item.menu_name,  # 스냅샷
       quantity=item.quantity,
       unit_price=item.unit_price  # 스냅샷
     )
     db.add(order_item)

5. db.commit()

6. SSE 이벤트 발행:
   await sse_manager.publish_to_admin(store_id, {
     "type": "new_order",
     "order": order_to_dict(order)
   })

7. 반환: OrderResponse
```

### 중요 설계 결정
- menu_name, unit_price를 스냅샷으로 저장: 이후 메뉴 가격 변경 시에도 주문 금액 불변
- session_id는 테이블 토큰에서 가져옴: 클라이언트가 임의로 변경 불가

---

## BL-05: 현재 세션 주문 내역 조회

### 입력
- table_id: int
- session_id: str (테이블 토큰에서 추출)

### 처리 흐름
```
1. Order 조회:
   orders = db.query(Order)
     .filter(Order.table_id == table_id)
     .filter(Order.session_id == session_id)
     .order_by(Order.created_at.asc())
     .all()

2. 각 Order에 OrderItem JOIN하여 반환

3. 반환: [OrderResponse, ...]
```

**핵심**: session_id 필터로 이전 세션의 주문은 자동 제외

---

## BL-06: 주문 상태 변경

### 입력
- order_id: int
- new_status: OrderStatus
- store_id: int (관리자 토큰에서 추출)

### 처리 흐름
```
1. Order 조회 (order_id + store_id)
   - 없으면: 404

2. 상태 전환 유효성 검증:
   valid_transitions = {
     PENDING: [PREPARING],
     PREPARING: [COMPLETED],
     COMPLETED: []   # 완료 후 변경 불가
   }
   if new_status not in valid_transitions[order.status]:
     raise 400 "유효하지 않은 상태 전환입니다"

3. order.status = new_status
   db.commit()

4. SSE 이벤트 발행:
   await sse_manager.publish_to_admin(store_id, {
     "type": "order_updated",
     "order_id": order.id,
     "status": new_status,
     "table_id": order.table_id
   })
   await sse_manager.publish_to_table(order.table_id, {
     "type": "order_updated",
     "order_id": order.id,
     "status": new_status
   })

5. 반환: OrderResponse
```

---

## BL-07: 주문 삭제 (직권 수정)

### 입력
- order_id: int
- store_id: int (관리자 토큰에서 추출)

### 처리 흐름
```
1. Order 조회 (order_id + store_id)
   - 없으면: 404

2. order.table_id 기록 (SSE 발행용)

3. Order 삭제 (OrderItem cascade delete)
   db.delete(order)
   db.commit()

4. SSE 이벤트 발행:
   await sse_manager.publish_to_admin(store_id, {
     "type": "order_deleted",
     "order_id": order_id,
     "table_id": table_id
   })

5. 반환: { success: true, deleted_order_id: order_id }
```

---

## BL-08: 테이블 이용 완료 처리

### 입력
- table_id: int
- store_id: int (관리자 토큰에서 추출)

### 처리 흐름
```
1. Table 조회 (table_id + store_id)
   - 없으면: 404

2. 현재 세션의 모든 Order 조회:
   current_orders = db.query(Order)
     .filter(Order.table_id == table_id)
     .filter(Order.session_id == table.current_session_id)
     .all()

3. OrderHistory 레코드 생성 (각 주문별):
   completed_at = now
   for order in current_orders:
     items_snapshot = [
       {"menu_name": i.menu_name, "quantity": i.quantity, "unit_price": i.unit_price}
       for i in order.items
     ]
     history = OrderHistory(
       store_id=store_id,
       table_id=table_id,
       session_id=table.current_session_id,
       original_order_id=order.id,
       menu_snapshot=json.dumps(items_snapshot),
       total_amount=order.total_amount,
       order_status=order.status,
       ordered_at=order.created_at,
       completed_at=completed_at
     )
     db.add(history)

4. 현재 세션 Order 전체 삭제:
   for order in current_orders:
     db.delete(order)  # OrderItem cascade delete

5. Table 세션 갱신:
   table.current_session_id = str(uuid.uuid4())
   db.commit()

6. SSE 이벤트 발행:
   await sse_manager.publish_to_admin(store_id, {
     "type": "session_completed",
     "table_id": table_id,
     "new_session_id": table.current_session_id
   })

7. 반환: { success: true, new_session_id: table.current_session_id }
```

---

## BL-09: 관리자 대시보드 데이터 조회

### 입력
- store_id: int (관리자 토큰에서 추출)

### 처리 흐름
```
1. 매장의 전체 Table 목록 조회 (ORDER BY table_number ASC)

2. 각 테이블별 현재 세션 주문 집계:
   for table in tables:
     current_orders = Order.filter(
       table_id=table.id,
       session_id=table.current_session_id
     ).order_by(created_at.desc())
     
     total = sum(o.total_amount for o in current_orders)
     recent_orders = current_orders[:5]  # 최신 5개
     
     result.append({
       "table_id": table.id,
       "table_number": table.table_number,
       "total_amount": total,
       "recent_orders": recent_orders,
       "all_orders": current_orders
     })

3. 반환: [TableOrderSummary, ...]
```

---

## BL-10: 과거 주문 내역 조회

### 입력
- table_id: int
- store_id: int
- date_from: date | None
- date_to: date | None

### 처리 흐름
```
1. Table 조회 (table_id + store_id) → 404 if not found

2. OrderHistory 조회:
   query = OrderHistory.filter(
     table_id=table_id,
     store_id=store_id
   )
   if date_from: query = query.filter(completed_at >= date_from)
   if date_to:   query = query.filter(completed_at <= date_to + timedelta(days=1))
   
   histories = query.order_by(completed_at.desc()).all()

3. 세션별 그룹화:
   groups = {}
   for h in histories:
     if h.session_id not in groups:
       groups[h.session_id] = {
         "session_id": h.session_id,
         "completed_at": h.completed_at,
         "orders": []
       }
     groups[h.session_id]["orders"].append(h)
   
   result = sorted(groups.values(), key=lambda g: g["completed_at"], reverse=True)

4. 반환: [OrderHistoryGroup, ...]
```

---

## BL-11: SSE 스트림 관리

### 관리자 SSE 구독
```
1. JWT 토큰 검증 (store_id 추출)
2. SSEManager.subscribe_admin(store_id) → AsyncGenerator
3. 스트림 유지 (클라이언트 연결 유지)
4. 연결 끊김 → SSEManager.unsubscribe()
5. keep-alive: 30초마다 빈 comment 전송 (": ping\n\n")
```

### 고객 SSE 구독
```
1. 테이블 토큰 검증 (table_id 추출)
2. SSEManager.subscribe_table(table_id) → AsyncGenerator
3. 스트림 유지
4. 연결 끊김 → SSEManager.unsubscribe()
```

### SSE 이벤트 포맷
```
data: {"type": "new_order", "order": {...}}\n\n
data: {"type": "order_updated", "order_id": 1, "status": "PREPARING", "table_id": 2}\n\n
data: {"type": "order_deleted", "order_id": 1, "table_id": 2}\n\n
data: {"type": "session_completed", "table_id": 2, "new_session_id": "uuid"}\n\n
```
