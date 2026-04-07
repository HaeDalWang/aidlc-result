# NFR Requirements — customer-frontend

## 1. 성능 요구사항

### NFR-PERF-001: 초기 로드 시간
- **목표**: 앱 로드 후 메뉴 화면 진입까지 **2초 이내** (로컬 네트워크 기준)
- **측정 기준**: 페이지 로드 시작 → 메뉴 카드 첫 렌더링 완료
- **대상 환경**: 매장 내 로컬 Wi-Fi, 태블릿 Chrome/Safari

### NFR-PERF-002: Vite 빌드 최적화
- Vite 프로덕션 빌드(`vite build`) 사용
- JavaScript 번들 minify + tree-shaking
- CSS 최소화 (Tailwind CDN 사용으로 별도 CSS purge 불필요)
- 아웃풋 경로: `static/customer/`

### NFR-PERF-003: 렌더링 성능
- 메뉴 카드 렌더링: DOM 조작 최소화, DocumentFragment 활용
- 장바구니 업데이트: 변경된 항목만 DOM 업데이트 (전체 재렌더링 지양)
- SSE 상태 업데이트: 해당 주문 카드 Progress Bar만 업데이트

---

## 2. 가용성 요구사항

### NFR-AVAIL-001: SSE 연결 복원력
- 연결 끊김 시 자동 재연결: 최대 5회, 3초 간격
- 5회 초과 시 사용자에게 새로고침 안내 (서비스 중단 없음, 폴링 불필요)

### NFR-AVAIL-002: API 오류 시 앱 지속성
- 메뉴 조회 실패: 에러 메시지 표시, 앱 비정상 종료 없음
- 주문 실패: 장바구니 유지, 재시도 가능
- localStorage 접근 실패(private mode 등): 에러 메시지 표시 후 진행 중단

---

## 3. 보안 요구사항

### NFR-SEC-001: XSS 방지
- 서버 응답 데이터를 DOM에 삽입 시 `textContent` 사용 (innerHTML 사용 금지)
- 예외: 신뢰할 수 있는 구조화된 HTML 생성 시 템플릿 리터럴로 안전하게 구성

### NFR-SEC-002: 인증 토큰 관리
- JWT 토큰: `localStorage`에 저장 (httpOnly 쿠키 불가 — 순수 클라이언트 환경)
- 모든 API 요청: `Authorization: Bearer {token}` 헤더 첨부
- 토큰 노출 방지: console.log 등에 토큰 출력 금지

### NFR-SEC-003: 비밀번호 처리
- 초기 설정 폼: `type="password"` 사용 (화면 마스킹)
- localStorage 저장 시 평문 저장 (단순 태블릿 앱 특성상 암호화 불필요)

---

## 4. 유지보수성 요구사항

### NFR-MAINT-001: 모듈 구조
- Vite 기반 ES6 모듈 분리 (`import/export`)
- 파일별 단일 책임: auth.js, menu.js, cart.js, order.js, order-history.js, api.js

### NFR-MAINT-002: 코드 일관성
- ES6+ 문법 사용 (const/let, arrow functions, template literals, async/await)
- DOM 조작 패턴 통일: `document.getElementById` / `querySelector` 사용
- 이벤트 리스너: addEventListener 사용 (인라인 이벤트 속성 금지)

### NFR-MAINT-003: 오류 처리 표준화
- 모든 API 호출: try/catch로 감싸기
- 사용자 노출 오류: CustomerAPI에서 표준 에러 객체 반환
- 콘솔 오류 로깅: 개발 중 유지, 프로덕션에서도 허용 (로컬 환경)

---

## 5. 사용성 요구사항

### NFR-UX-001: 터치 최소 크기
- 모든 버튼/탭/터치 가능 요소: 최소 **44x44px**
- 장바구니 +/- 버튼: 최소 44x44px (태블릿 터치 인터페이스)

### NFR-UX-002: 시각적 피드백
- 버튼 클릭/탭 탭: 즉각적인 시각 피드백 (CSS active 상태, 100ms 이내)
- 로딩 중: 버튼 비활성화 + 텍스트 변경 또는 스피너

### NFR-UX-003: 기기 방향
- 태블릿 **세로 모드** 전용
- 가로 모드: CSS로 "세로 모드로 전환해 주세요" 오버레이 (선택적 적용)

---

## 6. 접근성 요구사항 (기본 수준)

### NFR-A11Y-001: 시맨틱 HTML
- 적절한 HTML 태그 사용: `<button>`, `<nav>`, `<main>`, `<section>`, `<h1>`~`<h3>`
- 폼 요소: `<label>` + `for` 속성으로 입력 필드와 연결

### NFR-A11Y-002: 이미지 대체 텍스트
- 메뉴 이미지: `alt="메뉴명"` 속성 필수
- 장식용 이미지: `alt=""` 설정

### NFR-A11Y-003: 키보드 접근
- 폼 입력 필드: Tab 키로 이동 가능
- 모달 닫기: Escape 키 지원

---

## 7. 브라우저 지원

### NFR-BROWSER-001: 지원 브라우저
- **Chrome 최신 버전** (주 타겟)
- **Safari 최신 버전** (iPad 기본 브라우저)
- IE 미지원
- 폴리필 불필요 (ES6+ 네이티브 지원)

### NFR-BROWSER-002: 사용 가능 Web API
- ES6 Modules (Vite 번들 후 IIFE 또는 ES Module 방식)
- localStorage (장바구니, 인증 정보)
- EventSource (SSE)
- IntersectionObserver (카테고리 탭 스크롤 연동)
- fetch API (모든 HTTP 요청)
