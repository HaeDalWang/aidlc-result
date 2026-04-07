# Tech Stack Decisions — admin-frontend

| 항목 | 선택 | 이유 |
|---|---|---|
| 언어 | Vanilla JavaScript (ES6+) | 프레임워크 없음 (Q2 답변) |
| 스타일 | CSS3 (Flexbox/Grid) | 빌드 도구 없이 즉시 사용 |
| SSE | 브라우저 내장 EventSource API | 추가 라이브러리 불필요 |
| 상태 관리 | 모듈 레벨 변수 (간단한 상태) | 소규모 앱에 적합 |
| HTTP | Fetch API | 브라우저 내장 |
| 빌드 | 없음 (정적 파일 직접 서빙) | 로컬 개발 환경 단순화 |
