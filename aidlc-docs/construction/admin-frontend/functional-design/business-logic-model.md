# 비즈니스 로직 모델 — admin-frontend

## BL-01: 앱 초기화 및 인증 확인

```
페이지 로드
  → localStorage["admin_token"] 읽기
  → 토큰 없음 → 로그인 화면 렌더링
  → 토큰 있음 → JWT exp 확인
      → 만료됨 → localStorage 삭제 → 로그인 화면
      → 유효함 → 대시보드 초기화
                  → GET /api/orders/summary (테이블 목록 로드)
                  → SSE 연결 시작
                  → 대시보드 렌더링
```

## BL-02: 관리자 로그인

```
입력: store_identifier, username, password
  → 빈 값 검증 → 에러 메시지 표시
  → POST /api/auth/admin-login
      → 성공: token → localStorage["admin_token"] 저장
               → 대시보드 초기화 (BL-01 후반부)
      → 실패(401): "자격 증명이 올바르지 않습니다" 표시
      → 네트워크 오류: "서버에 연결할 수 없습니다" 표시
```

## BL-03: 대시보드 초기화

```
GET /api/orders/summary (Authorization: Bearer {token})
  → 응답: [{ tableId, tableNumber, totalAmount, orders }]
  → 각 테이블별 TableSummary 객체 생성
  → 테이블 번호 오름차순 정렬
  → 그리드 렌더링
  → SSE 연결 시작 (BL-04)
```

## BL-04: SSE 연결 및 이벤트 처리

```
EventSource("/api/sse/admin", { headers: Authorization })
  → 연결 성공: sseConnected = true

이벤트 수신:
  "new_order" → 해당 tableId의 카드에 order 추가
                → totalAmount 재계산
                → 카드 강조 표시 (3초 후 해제)

  "order_updated" → 해당 order의 status 업데이트
                  → 열린 상세 모달도 즉시 반영

  "order_deleted" → 해당 order 목록에서 제거
                  → totalAmount 재계산
                  → 열린 상세 모달도 즉시 반영

  "session_completed" → 해당 tableId 카드의 orders = []
                      → totalAmount = 0

연결 끊김(onerror):
  → sseConnected = false
  → 3초 후 재연결 시도 (최대 5회, 지수 백오프)
```

## BL-05: 주문 상세 모달 열기

```
테이블 카드의 주문 클릭
  → 해당 order 데이터로 모달 렌더링
  → 전체 items 목록 표시
  → 현재 status에 따라 상태 변경 버튼 표시:
      PENDING   → "준비 시작" 버튼
      PREPARING → "완료 처리" 버튼
      COMPLETED → 버튼 없음
  → "주문 삭제" 버튼 (항상)
```

## BL-06: 주문 상태 변경

```
상태 변경 버튼 클릭
  → PATCH /api/orders/{id}/status { status: new_status }
      → 성공: 모달 내 status 즉시 업데이트
               → SSE로 대시보드도 자동 반영
      → 실패: "상태 변경에 실패했습니다" 토스트
```

## BL-07: 주문 삭제

```
"주문 삭제" 버튼 클릭
  → 확인 팝업: "이 주문을 삭제하시겠습니까?"
      → 취소: 팝업 닫기
      → 확인: DELETE /api/orders/{id}
                → 성공: 모달 닫기
                         → SSE로 대시보드 자동 반영
                → 실패: "삭제에 실패했습니다" 토스트
```

## BL-08: 테이블 이용 완료 처리

```
테이블 카드의 "이용 완료" 버튼 클릭
  → 확인 팝업: "{n}번 테이블을 이용 완료 처리하시겠습니까?"
      → 취소: 팝업 닫기
      → 확인: POST /api/tables/{id}/complete
                → 성공: "이용 완료 처리되었습니다" 토스트
                         → SSE session_completed로 카드 자동 초기화
                → 실패: "처리에 실패했습니다" 토스트
```

## BL-09: 과거 주문 내역 조회

```
테이블 카드의 "과거 내역" 버튼 클릭
  → GET /api/tables/{id}/history?date_from=&date_to=
      → 응답: [OrderHistoryGroup]
      → 세션별 그룹 목록 렌더링 (최신순)
      → 날짜 필터 변경 시 재조회
  → "닫기" 버튼 → 모달 닫기
```

## BL-10: 테이블 필터링

```
필터 바에서 테이블 번호 선택
  → selectedTableId = tableId (전체 선택이면 null)
  → 그리드에서 선택된 테이블 카드만 표시
  → SSE 이벤트는 계속 수신 (필터는 표시만 제한)
```

## BL-11: 자동 로그아웃

```
API 요청 응답 401 수신 시
  → localStorage["admin_token"] 삭제
  → "세션이 만료되었습니다" 알림
  → SSE 연결 종료
  → 로그인 화면으로 이동
```
