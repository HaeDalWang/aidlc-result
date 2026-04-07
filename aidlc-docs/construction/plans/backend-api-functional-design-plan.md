# Functional Design Plan — backend-api

## 실행 체크리스트

- [x] Step 1: Unit 컨텍스트 분석 (unit-of-work.md, story-map)
- [x] Step 2: 질문 검토 — 요구사항 명확, 추가 질문 불필요
- [x] Step 3: domain-entities.md 생성
- [x] Step 4: business-logic-model.md 생성
- [x] Step 5: business-rules.md 생성
- [ ] Step 6: 완료 보고 및 승인 대기

## 설계 결정 사항

| 항목 | 결정 | 근거 |
|---|---|---|
| 주문 상태 흐름 | 단방향 (PENDING→PREPARING→COMPLETED) | 요구사항에 역방향 없음 |
| 세션 ID 생성 | 테이블 초기 설정 시 + 이용 완료 시 갱신 | 항상 유효한 session_id 보유 |
| 테이블 비밀번호 | plain text 저장 (단순 PIN 방식) | 복잡 인증 제외 요구사항 |
| 관리자 비밀번호 | bcrypt 해싱 | 요구사항 명시 |
| 주문 이력 보존 | 이용 완료 시 모든 주문 → OrderHistory | 세션 내 완료된 주문도 보존 |
