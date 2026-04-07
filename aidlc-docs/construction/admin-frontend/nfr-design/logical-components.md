# Logical Components — admin-frontend

## 파일 구조

```
static/admin/
├── index.html          ← SPA 진입점 (모든 화면 포함)
├── css/
│   └── style.css       ← 전체 스타일 (변수, 레이아웃, 카드, 모달, 애니메이션)
└── js/
    ├── api.js           ← HTTP 요청 모듈 (Fetch 래퍼, 401 처리)
    ├── auth.js          ← 로그인 폼, JWT 저장/삭제, 자동 로그아웃
    ├── sse.js           ← EventSource 연결, 이벤트 디스패치, 재연결
    ├── dashboard.js     ← 대시보드 초기화, 테이블 그리드, 필터, SSE 핸들러
    ├── order-detail.js  ← 주문 상세 모달, 상태 변경, 삭제
    └── past-history.js  ← 과거 내역 모달, 날짜 필터
```

## 모듈 로드 순서 (index.html)

```html
<script src="/admin/js/api.js"></script>
<script src="/admin/js/auth.js"></script>
<script src="/admin/js/sse.js"></script>
<script src="/admin/js/order-detail.js"></script>
<script src="/admin/js/past-history.js"></script>
<script src="/admin/js/dashboard.js"></script>  <!-- 마지막: 앱 초기화 -->
```
