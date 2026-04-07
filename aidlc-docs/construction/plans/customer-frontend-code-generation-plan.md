# Code Generation Plan — customer-frontend

## 컨텍스트

- **Unit**: customer-frontend
- **코드 위치**: `customer-frontend/` (Vite 소스), 빌드 아웃풋 → `static/customer/`
- **기술 스택**: Vite + Vanilla JS (ES6+) + Tailwind CSS CDN + Font Awesome CDN + dayjs CDN
- **담당 스토리**: US-001~010, US-017 (11개)

## 구현 스토리 매핑

| 스텝 | 관련 스토리 |
|---|---|
| Step 4 (package.json, vite.config.js) | 전체 인프라 |
| Step 5 (index.html) | 전체 (앱 진입점) |
| Step 6 (style.css) | 전체 (레이아웃/스타일) |
| Step 7 (api.js) | US-001~003, US-007, US-009 |
| Step 8 (auth.js) | US-001, US-002 |
| Step 9 (cart.js) | US-005, US-006 |
| Step 10 (menu.js) | US-003, US-004, US-005 |
| Step 11 (order.js) | US-007, US-008 |
| Step 12 (order-history.js) | US-009, US-010, US-017 |
| Step 13 (main.js) | 전체 통합 |
| Step 14 (코드 요약) | 문서화 |

---

## 실행 체크리스트

### PART 1 — PLANNING
- [x] Step 1: 컨텍스트 분석
- [x] Step 2: 코드 생성 계획 수립 (이 파일)
- [x] Step 3: 사용자 승인 대기

### PART 2 — GENERATION

- [x] Step 4: 프로젝트 구조 (`customer-frontend/package.json`, `vite.config.js`)
- [x] Step 5: 앱 진입점 (`customer-frontend/index.html`)
- [x] Step 6: 글로벌 스타일 (`customer-frontend/src/style.css`)
- [x] Step 7: API 클라이언트 (`customer-frontend/src/api.js`)
- [x] Step 8: 인증 모듈 (`customer-frontend/src/auth.js`) — US-001, US-002
- [x] Step 9: 장바구니 모듈 (`customer-frontend/src/cart.js`) — US-005, US-006
- [x] Step 10: 메뉴 모듈 (`customer-frontend/src/menu.js`) — US-003, US-004
- [x] Step 11: 주문 모듈 (`customer-frontend/src/order.js`) — US-007, US-008
- [x] Step 12: 주문내역 + SSE 모듈 (`customer-frontend/src/order-history.js`) — US-009, US-010, US-017
- [x] Step 13: 앱 컨트롤러 (`customer-frontend/src/main.js`) — 전체 통합
- [x] Step 14: 코드 요약 문서 (`aidlc-docs/construction/customer-frontend/code/summary.md`)

---

## 생성 파일 목록

```
customer-frontend/               ← Vite 프로젝트 루트
├── package.json
├── vite.config.js               ← 빌드 아웃풋: ../static/customer/
├── index.html                   ← CDN 스크립트 포함 Vite 진입점
└── src/
    ├── style.css                ← 커스텀 CSS (Tailwind 보완)
    ├── api.js                   ← CustomerAPI (HTTP 클라이언트)
    ├── auth.js                  ← CustomerAuth (설정/자동 로그인)
    ├── cart.js                  ← CartManager (장바구니 + Storage)
    ├── menu.js                  ← MenuView (메뉴 목록 + 모달)
    ├── order.js                 ← OrderView (주문 확인 + 토스트)
    ├── order-history.js         ← OrderHistoryView + SSEClient
    └── main.js                  ← AppController (진입점 + 라우팅)

static/customer/                 ← Vite 빌드 아웃풋 (FastAPI 서빙)
  (npm run build 후 자동 생성)
```
