# NFR Requirements Plan — customer-frontend

## 컨텍스트

- **Unit**: customer-frontend
- **기술 스택**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **배포 환경**: FastAPI StaticFiles (`/customer` 경로)
- **사용 환경**: 태블릿 (세로 모드 고정), 매장 내 로컬 네트워크

---

## 실행 체크리스트

### PART 1 — PLANNING
- [x] Step 1: Functional Design 분석 완료
- [x] Step 2: NFR 계획 수립 (이 파일)
- [x] Step 3: 사용자 답변 수집 (Q1:B-Vite, Q2:B-TailwindCDN, Q3:D, Q4:A, Q5:A, Q6:B / 명확화: Tailwind CDN 방식 확정)

### PART 2 — GENERATION (Step 4 이후 실행)
- [x] Step 4: nfr-requirements.md 생성
- [x] Step 5: tech-stack-decisions.md 생성

---

## 질문 목록

### [Q1] 빌드 도구 — 번들러 사용 여부

customer-frontend는 순수 정적 파일(HTML/CSS/JS)로 FastAPI가 서빙합니다. **빌드 도구 사용 여부**를 결정해주세요.

A. 순수 정적 파일 — 번들러 없음, ES6 모듈(import/export) 또는 스크립트 태그 직접 사용  
B. Vite (개발 서버 + 빌드 아웃풋을 static/customer/에 복사)  
C. Webpack  
D. 가능한 단순하게 — 단일 JS 파일로 작성 (모듈 분리 없음)

[Answer]: B

---

### [Q2] CSS 접근 방식

스타일링 방법을 결정해주세요.

A. 순수 CSS (CSS Variables 활용, 프레임워크 없음)  
B. Tailwind CSS (CDN)  
C. Bootstrap (CDN)  
D. 순수 CSS + 간단한 CSS Reset (normalize.css)

[Answer]: B

---

### [Q3] 외부 JavaScript 라이브러리 허용 여부

CDN 또는 직접 포함 가능한 **외부 JS 라이브러리 사용 여부**를 결정해주세요.

A. 완전 Vanilla — 외부 라이브러리 일절 없음  
B. 아이콘 라이브러리만 허용 (예: Font Awesome CDN)  
C. 유틸리티 라이브러리 허용 (예: dayjs for 날짜 포맷)  
D. B + C 모두 허용

[Answer]: D

---

### [Q4] 브라우저 지원 범위

**지원 대상 브라우저**를 결정해주세요. (태블릿에 설치된 브라우저 기준)

A. 최신 Chrome/Safari만 지원 (ES6+ 네이티브, 폴리필 없음)  
B. Chrome + Safari + Firefox 최신 2개 버전  
C. 크롬 기반 Android 브라우저 포함 (Android 8+)  
D. IE 제외 모든 현대 브라우저 (폴리필 필요할 수 있음)

[Answer]: A

---

### [Q5] 성능 목표 — 초기 로드 시간

매장 내 로컬 네트워크 환경에서 **초기 페이지 로드 목표 시간**을 결정해주세요.

A. 2초 이내 (메뉴 화면 진입까지 포함)  
B. 3초 이내  
C. 5초 이내 (로컬 네트워크라 관대하게)  
D. 별도 목표 없음

[Answer]: A

---

### [Q6] 접근성 (Accessibility) 요구 수준

**웹 접근성(A11y) 준수 수준**을 결정해주세요.

A. 없음 — 특별한 접근성 요구사항 없음  
B. 기본 수준 — 시맨틱 HTML, alt 텍스트, 키보드 접근 가능  
C. WCAG 2.1 AA 준수  
D. WCAG 2.1 AAA 준수

[Answer]: B

---
