# Execution Plan — 테이블오더 서비스

## Detailed Analysis Summary

### Change Impact Assessment

| 항목 | 해당 여부 | 설명 |
|---|---|---|
| **User-facing changes** | Yes | 고객용 UI + 관리자용 UI 신규 구축 |
| **Structural changes** | Yes | 신규 시스템 전체 아키텍처 설계 |
| **Data model changes** | Yes | Store, Table, Menu, Order, OrderHistory 등 신규 데이터 모델 |
| **API changes** | Yes | 신규 REST API + SSE 엔드포인트 |
| **NFR impact** | Yes | SSE 실시간 통신, JWT 인증, bcrypt 보안, SQLite 동시성 |

### Risk Assessment

| 항목 | 수준 |
|---|---|
| **Risk Level** | Medium |
| **Rollback Complexity** | Easy (로컬 개발 환경) |
| **Testing Complexity** | Moderate (SSE, JWT, 세션 로직) |

**Risk 이유**: 다수의 컴포넌트 (백엔드 + 고객 프론트 + 관리자 프론트) 신규 구축, 실시간 SSE 통신, 세션 관리 로직이 복잡함

---

## Workflow Visualization

```
[Start]
   |
   v
+----------------------------------+
| INCEPTION PHASE                  |
|                                  |
| [x] Workspace Detection          |  COMPLETED
| [x] Requirements Analysis        |  COMPLETED
| [x] User Stories                 |  SKIPPED
| [x] Workflow Planning            |  IN PROGRESS
| [ ] Application Design           |  EXECUTE
| [ ] Units Generation             |  EXECUTE
+----------------------------------+
   |
   v
+----------------------------------+
| CONSTRUCTION PHASE               |
|                                  |
| Per-Unit Loop (3 Units):         |
| [ ] Functional Design            |  EXECUTE
| [ ] NFR Requirements             |  EXECUTE
| [ ] NFR Design                   |  EXECUTE
| [ ] Infrastructure Design        |  SKIP
| [ ] Code Generation              |  EXECUTE (ALWAYS)
|                                  |
| [ ] Build and Test               |  EXECUTE (ALWAYS)
+----------------------------------+
   |
   v
+----------------------------------+
| OPERATIONS PHASE                 |
| [ ] Operations                   |  PLACEHOLDER
+----------------------------------+
   |
   v
[Complete]
```

---

## Phases to Execute

### 🔵 INCEPTION PHASE

| 단계 | 상태 | 근거 |
|---|---|---|
| Workspace Detection | ✅ COMPLETED | 항상 실행 |
| Reverse Engineering | ⏭️ SKIPPED | Greenfield 프로젝트 |
| Requirements Analysis | ✅ COMPLETED | 항상 실행 |
| User Stories | ⏭️ SKIPPED | 요구사항이 충분히 명확하고 상세하게 정의됨 |
| Workflow Planning | 🔄 IN PROGRESS | 항상 실행 |
| Application Design | ▶️ EXECUTE | 다중 컴포넌트(백엔드, 고객 프론트, 관리자 프론트) 신규 설계 필요; 서비스 계층 및 컴포넌트 간 의존성 정의 필요 |
| Units Generation | ▶️ EXECUTE | 3개의 명확히 독립적인 단위(백엔드 API, 고객 프론트, 관리자 프론트)로 분해 가능 |

### 🟢 CONSTRUCTION PHASE (per-unit)

| 단계 | 상태 | 근거 |
|---|---|---|
| Functional Design | ▶️ EXECUTE | 신규 데이터 모델(7개 엔티티), 복잡한 세션 관리 로직, 주문 상태 머신 정의 필요 |
| NFR Requirements | ▶️ EXECUTE | SSE 성능 요구사항, JWT/bcrypt 보안, SQLite 동시성 제약 정의 필요 |
| NFR Design | ▶️ EXECUTE | SSE 패턴, JWT 미들웨어 패턴, SQLite 연결 관리 패턴 설계 필요 |
| Infrastructure Design | ⏭️ SKIP | 로컬 개발 환경 전용; 클라우드/배포 인프라 없음 |
| Code Generation | ▶️ EXECUTE | 항상 실행 |
| Build and Test | ▶️ EXECUTE | 항상 실행 |

### 🟡 OPERATIONS PHASE

| 단계 | 상태 | 근거 |
|---|---|---|
| Operations | 🔲 PLACEHOLDER | 미래 확장을 위한 플레이스홀더 |

---

## Units (작업 단위)

총 3개 Unit으로 분해 예정 (Units Generation 단계에서 상세 정의):

| Unit | 이름 | 설명 |
|---|---|---|
| Unit 1 | Backend API | FastAPI + SQLite: 인증, 메뉴, 주문, SSE 엔드포인트 |
| Unit 2 | Customer Frontend | Vanilla JS: 고객용 메뉴 조회, 장바구니, 주문 UI |
| Unit 3 | Admin Frontend | Vanilla JS: 관리자용 주문 모니터링, 테이블 관리 UI |

**실행 순서**: Unit 1 (Backend) → Unit 2 (Customer Frontend) → Unit 3 (Admin Frontend)
- 백엔드 API가 먼저 완성되어야 프론트엔드 API 연동 설계 가능

---

## Success Criteria

- **Primary Goal**: 테이블에서 고객이 메뉴를 선택하고 주문할 수 있는 완전한 MVP 구현
- **Key Deliverables**:
  - FastAPI 백엔드 서버 (SQLite DB 포함)
  - 고객용 Vanilla JS 웹 앱
  - 관리자용 Vanilla JS 웹 앱
  - SSE 기반 실시간 주문 업데이트
  - JWT 기반 관리자 인증
  - DB 시드 데이터 (초기 매장 1개)
- **Quality Gates**:
  - 주문 생성 ~ 관리자 화면 표시 2초 이내
  - 장바구니 localStorage 영속성 확인
  - 테이블 세션 종료 플로우 정상 동작
