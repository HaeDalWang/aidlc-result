# Unit of Work Plan

## 분석 기반

- Application Design에서 3개 컴포넌트 그룹 확정 (Backend / Customer Frontend / Admin Frontend)
- 기술 스택 및 디렉토리 구조 확정
- 추가 질문 불필요 — 설계 단계에서 모든 결정 완료

## 실행 체크리스트

- [x] Step 1: Application Design 컨텍스트 분석
- [x] Step 2: Unit 경계 결정 (3개 Unit)
- [x] Step 3: unit-of-work.md 생성
- [x] Step 4: unit-of-work-dependency.md 생성
- [x] Step 5: unit-of-work-story-map.md 생성
- [x] Step 6: 완료 검증

## Unit 구성 결정

| Unit | 이름 | 포함 컴포넌트 |
|---|---|---|
| Unit 1 | backend-api | BC-01 ~ BC-13 (FastAPI + SQLite) |
| Unit 2 | customer-frontend | FC-01 ~ FC-07 (Vanilla JS) |
| Unit 3 | admin-frontend | FA-01 ~ FA-08 (Vanilla JS) |

**실행 순서**: Unit 1 → Unit 2 → Unit 3
**코드 위치**: 단일 레포지토리, FastAPI 서버 루트에서 정적 파일 서빙
