# 요구사항 명확화 질문

테이블오더 서비스 구축을 위한 요구사항 문서를 검토했습니다.
아래 질문들에 답변해 주시면 요구사항 문서 및 개발 계획을 완성할 수 있습니다.

각 질문 아래 `[Answer]:` 태그 뒤에 알파벳 보기(A, B, C 등)를 적어주세요.
선택지가 맞지 않으면 마지막 "Other" 옵션을 선택하고 직접 설명해 주세요.
모든 답변 완료 후 "완료"라고 알려주세요.

---

## Question 1
백엔드 기술 스택으로 어떤 것을 선호하시나요?

A) Python (FastAPI 또는 Flask)
B) Node.js (Express 또는 Fastify)
C) Java (Spring Boot)
D) Go
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 2
프론트엔드 기술 스택으로 어떤 것을 선호하시나요?

A) React (TypeScript)
B) Vue.js
C) Vanilla JavaScript (프레임워크 없음)
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 3
데이터베이스로 어떤 것을 선호하시나요?

A) PostgreSQL (관계형 DB)
B) MySQL / MariaDB (관계형 DB)
C) SQLite (개발/소규모 용도)
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 4
배포 환경을 어떻게 구성할 예정인가요?

A) Docker Compose (로컬/단일 서버)
B) AWS (EC2, ECS, 또는 Lambda)
C) 배포 설정 불필요 (로컬 개발 환경만)
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 5
메뉴 이미지 처리 방식을 어떻게 하시겠습니까?
(요구사항 문서에 "이미지 URL"만 언급됨)

A) 외부 URL만 지원 (이미지 업로드 기능 없음)
B) 파일 업로드 지원 (서버에 저장)
C) 외부 이미지 스토리지 사용 (예: AWS S3)
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 6
초기 매장(Store) 데이터는 어떻게 생성하나요?
(요구사항 문서에 매장 생성 프로세스가 명시되지 않음)

A) 데이터베이스 시드(Seed) 데이터로 초기 매장 1개 생성 (개발/데모용)
B) 슈퍼 관리자 계정을 통한 매장 생성 API 제공
C) MVP에서는 매장 생성 제외, DB에 직접 데이터 입력
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 7
동시 사용자 수(테이블 수) 기준으로 시스템 규모를 어떻게 예상하시나요?

A) 소규모 (테이블 10개 이하, 동시 사용자 20명 이하)
B) 중간 규모 (테이블 50개 이하, 동시 사용자 100명 이하)
C) 대규모 (테이블 100개 이상, 동시 사용자 200명 이상)
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 8
Security Extensions을 적용하시겠습니까?

A) Yes — 모든 보안 규칙을 강제 적용 (프로덕션 수준 애플리케이션에 권장)
B) No — 보안 규칙 생략 (PoC, 프로토타입, 실험용 프로젝트에 적합)
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 9
관리자 메뉴 관리 기능(등록/수정/삭제)을 MVP에 포함할까요?
(요구사항 문서 Section 3.2.4에 메뉴 관리 명시되어 있으나, Section 4 MVP 범위에는 포함되지 않음)

A) MVP에 포함 (메뉴 CRUD 모두 구현)
B) MVP에서 제외 (읽기 전용, DB 직접 데이터 입력)
C) 부분 포함 (메뉴 조회 + 등록만, 수정/삭제 제외)
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 10
주문 상태 실시간 업데이트(고객 화면의 주문 내역 조회)를 어떻게 구현할까요?
(요구사항 문서에 "선택사항"으로 표시됨)

A) SSE로 실시간 업데이트 구현 (관리자 화면과 동일한 방식)
B) 폴링 방식 (주기적으로 서버에 요청, 예: 5초마다)
C) MVP에서 제외 (수동 새로고침으로 확인)
X) Other (please describe after [Answer]: tag below)

[Answer]: A
