# Code Generation Summary — customer-frontend

## 생성 파일 목록

| 파일 | 설명 | 담당 스토리 |
|---|---|---|
| `customer-frontend/package.json` | Vite 프로젝트 설정 | - |
| `customer-frontend/vite.config.js` | 빌드 아웃풋: `static/customer/` | - |
| `customer-frontend/index.html` | 앱 진입점, CDN 로드, HTML 구조 전체 | 전체 |
| `customer-frontend/src/style.css` | 커스텀 CSS (카드, 탭, Progress Bar, 모달) | - |
| `customer-frontend/src/api.js` | HTTP 클라이언트, 오류 표준화 | US-001~003, US-007, US-009 |
| `customer-frontend/src/auth.js` | 자동 로그인, 설정 폼, localStorage Storage 유틸 | US-001, US-002 |
| `customer-frontend/src/cart.js` | 장바구니 상태, localStorage 동기화, 화면 렌더링 | US-005, US-006 |
| `customer-frontend/src/menu.js` | 메뉴 목록, 카테고리 탭, 상세 모달, 수량 배지 | US-003, US-004 |
| `customer-frontend/src/order.js` | 주문 확인 모달, 주문 제출, 토스트 | US-007, US-008 |
| `customer-frontend/src/order-history.js` | 주문 내역, SSEClient, 상태 Progress Bar | US-009, US-010, US-017 |
| `customer-frontend/src/main.js` | AppController, 라우팅, 탭 전환, 이벤트 조율 | 전체 통합 |

## 주요 설계 결정 반영

| 결정 | 구현 위치 |
|---|---|
| Vite 빌드 → `static/customer/` | `vite.config.js` |
| Tailwind Play CDN | `index.html` `<head>` |
| Font Awesome CDN | `index.html` `<head>` |
| dayjs CDN | `index.html` body 하단 |
| 카테고리 탭 스크롤 이동 | `menu.js` `scrollToCategory()` |
| IntersectionObserver 탭 연동 | `menu.js` `setupCategoryObserver()` |
| 메뉴 상세 모달 | `menu.js` `openDetailModal()` |
| 카드 직접 +/- | `menu.js` `renderQtyButtons()` |
| 주문 확인 모달 (Q5-B) | `order.js` `showConfirmModal()` |
| 성공 토스트 + 5초 후 이동 (Q6-A) | `order.js` `showSuccessToast()` |
| Progress Bar 상태 (Q7-B) | `order-history.js` `updateOrderStatus()` |
| SSE 최대 5회 재연결 (Q8-A) | `order-history.js` `SSEClient` |
| session_completed 처리 (Q9-A) | `order-history.js` `handleSessionCompleted()` |
| dot 배지 (Q10-C) | `cart.js` `updateTabBadge()` |
| 이미지 없음 → 회색 배경 (Q11-C) | `menu.js` `createImagePlaceholder()` |
| 태블릿 세로 모드 강제 (Q12-A) | `style.css` `@media (orientation: landscape)` |
| XSS 방지 — textContent | 전 파일 |
| localStorage 안전 래퍼 | `auth.js` `Storage` |

## 빌드 및 실행

```bash
cd customer-frontend
npm install
npm run dev      # 개발 서버 (http://localhost:5173, /api 프록시 → :8000)
npm run build    # static/customer/ 로 빌드 아웃풋 생성
```
