# Code Generation Summary — admin-frontend

## 생성된 파일

| 파일 | 역할 |
|---|---|
| `static/admin/index.html` | SPA 진입점 (모든 화면 포함) |
| `static/admin/css/style.css` | 전체 스타일 (레이아웃, 카드, 모달, 애니메이션) |
| `static/admin/js/api.js` | Fetch 래퍼, JWT 헤더 자동 첨부, 401 자동 로그아웃 |
| `static/admin/js/auth.js` | 로그인 폼, JWT 저장/삭제, showToast, showConfirm |
| `static/admin/js/sse.js` | EventSource 연결, 이벤트 디스패치, 지수 백오프 재연결 |
| `static/admin/js/order-detail.js` | 주문 상세 모달, 상태 변경, 삭제 |
| `static/admin/js/past-history.js` | 과거 내역 모달, 날짜 필터 |
| `static/admin/js/dashboard.js` | 대시보드 그리드, SSE 핸들러, 이용 완료 처리 |

## 구현된 스토리

| 스토리 | 구현 위치 |
|---|---|
| US-011 관리자 로그인 | auth.js (LoginScreen) |
| US-012 세션 유지/자동 로그아웃 | auth.js (isTokenValid, 401 처리) |
| US-013 실시간 주문 모니터링 | dashboard.js + sse.js |
| US-014 주문 상세/상태 변경 | order-detail.js |
| US-015 주문 삭제 | order-detail.js |
| US-016 테이블 이용 완료 | dashboard.js (_completeSession) |
| US-018 과거 주문 내역 | past-history.js |

## 백엔드 연동 주의사항

### SSE 라우터 변경 필요
EventSource API는 커스텀 헤더를 지원하지 않으므로, 관리자 SSE와 테이블 SSE 엔드포인트에서 `?token=` 쿼리 파라미터를 통한 인증을 지원해야 합니다.

**백엔드(feature/backend-api)에서 `routers/sse.py` 수정 필요:**
- `GET /api/sse/admin?token={jwt}` — 쿼리 파라미터로 JWT 수신
- `GET /api/sse/table/{id}?token={table_token}` — 쿼리 파라미터로 테이블 토큰 수신

## 접속 URL
- 관리자 앱: `http://localhost:8000/admin/`
- 로그인 정보: `demo-store / admin / admin1234`
