# Tech Stack Decisions — customer-frontend

## 확정된 기술 스택

| 구분 | 기술 | 버전 | 비고 |
|---|---|---|---|
| 언어 | Vanilla JavaScript | ES6+ | 프레임워크 없음 |
| 마크업 | HTML5 | - | 시맨틱 HTML |
| 빌드 도구 | **Vite** | 최신 stable | 개발 서버 + 프로덕션 빌드 |
| CSS 프레임워크 | **Tailwind CSS** | CDN (Play CDN) | npm 패키지 아님 |
| 아이콘 | **Font Awesome** | CDN (v6) | - |
| 날짜 포맷 | **dayjs** | CDN | 주문 시각 표시용 |
| 실시간 통신 | EventSource (SSE) | 네이티브 | 외부 라이브러리 없음 |
| 상태 저장 | localStorage | 네이티브 | 장바구니, 인증 정보 |

---

## 빌드 도구: Vite

### 선택 이유
- 빠른 개발 서버 (HMR)
- 프로덕션 빌드 최적화 (minify, tree-shaking)
- ES6 모듈 지원으로 파일별 책임 분리 가능
- 설정이 간단 (별도 Webpack config 불필요)

### 프로젝트 구조 (소스)
```
customer-frontend/           ← Vite 프로젝트 루트 (workspace root 외부 또는 내부)
├── index.html               ← Vite 진입점
├── vite.config.js           ← 빌드 아웃풋 경로: ../static/customer/
├── package.json
└── src/
    ├── main.js              ← AppController
    ├── auth.js
    ├── menu.js
    ├── cart.js
    ├── order.js
    ├── order-history.js
    ├── api.js
    └── style.css            ← 커스텀 CSS (Tailwind 보완용)
```

### 빌드 아웃풋 경로
```javascript
// vite.config.js
export default {
  build: {
    outDir: '../static/customer',
    emptyOutDir: true
  }
}
```

### 개발/빌드 명령어
```bash
cd customer-frontend
npm install
npm run dev       # 개발 서버 (http://localhost:5173)
npm run build     # static/customer/ 로 빌드 아웃풋 생성
```

---

## CSS: Tailwind CSS (Play CDN)

### 선택 이유
- 유틸리티 클래스 기반으로 빠른 UI 구현
- CDN 방식으로 npm 패키지 설치 없이 사용
- 반응형 유틸리티 클래스 내장

### 사용 방식
```html
<!-- index.html <head>에 추가 -->
<script src="https://cdn.tailwindcss.com"></script>
```

### 주의사항
- Play CDN은 모든 Tailwind 클래스 포함 (약 300KB, 개발/소규모 프로덕션 적합)
- 로컬 네트워크 환경이므로 CDN 크기 영향 최소
- 커스텀 테마 설정: `tailwind.config` 블록으로 인라인 설정 가능

### 커스텀 색상 (주문 상태)
```html
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          status: {
            pending: '#ef4444',    // 대기중: 빨간색
            preparing: '#eab308',  // 준비중: 노란색
            completed: '#22c55e'   // 완료: 초록색
          }
        }
      }
    }
  }
</script>
```

---

## 아이콘: Font Awesome (CDN)

### 선택 이유
- 메뉴, 장바구니, 주문내역 탭 아이콘
- +/- 버튼, 닫기 버튼 아이콘
- CDN으로 간단 통합

### 사용 방식
```html
<link rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
```

### 주요 사용 아이콘
| 위치 | 아이콘 클래스 |
|---|---|
| 메뉴 탭 | `fa-utensils` |
| 장바구니 탭 | `fa-shopping-cart` |
| 주문내역 탭 | `fa-receipt` |
| 수량 증가 | `fa-plus` |
| 수량 감소 | `fa-minus` |
| 모달 닫기 | `fa-xmark` |
| 설정 버튼 | `fa-gear` |

---

## 날짜 포맷: dayjs (CDN)

### 선택 이유
- 주문 내역에서 `createdAt` 타임스탬프 → "14:30" 또는 "04/07 14:30" 포맷
- 경량 라이브러리 (2KB gzip)
- Vanilla JS와 완벽 호환

### 사용 방식
```html
<script src="https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js"></script>
```

### 사용 예시
```javascript
dayjs('2026-04-07T14:30:00Z').format('HH:mm')    // "14:30"
dayjs('2026-04-07T14:30:00Z').format('MM/DD HH:mm') // "04/07 14:30"
```

---

## CDN 의존성 요약 (index.html)

```html
<!-- Tailwind CSS Play CDN -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Font Awesome 6 -->
<link rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

<!-- dayjs -->
<script src="https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js"></script>
```

> **주의**: CDN 의존성은 매장 내 인터넷 연결이 필요합니다.
> 오프라인 환경 대비 시 CDN 파일을 `static/customer/vendor/`에 로컬 복사 고려.
