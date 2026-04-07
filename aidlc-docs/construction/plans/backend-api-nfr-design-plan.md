# NFR Design Plan — backend-api

## 실행 체크리스트

- [x] Step 1: NFR Requirements 아티팩트 분석
- [x] Step 2: 추가 질문 불필요 판단 (패턴 선택 명확)
- [x] Step 3: nfr-design-patterns.md 생성
- [x] Step 4: logical-components.md 생성
- [ ] Step 5: 완료 보고 및 승인 대기

## 적용할 NFR 패턴 목록

| NFR | 패턴 |
|---|---|
| SSE 실시간 통신 | Pub/Sub (asyncio.Queue) |
| JWT 인증 | Middleware/Dependency Injection |
| bcrypt 비밀번호 | Secure Hash Pattern |
| SQLite 동시성 | WAL Mode + Connection Pool |
| API 오류 처리 | Consistent Error Response Pattern |
| 매장 격리 | Scoped Authorization Pattern |
