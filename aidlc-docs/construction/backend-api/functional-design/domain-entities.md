# 도메인 엔티티 (Domain Entities) — backend-api

## 엔티티 관계 개요

```
Store (1) ──── (N) Admin
  |
  +──── (N) Table (1) ──── (N) Order (1) ──── (N) OrderItem
  |                              |
  +──── (N) Category (1) ──── (N) Menu
  |
  +──── (N) OrderHistory (1) ──── (N) OrderHistoryItem
```

---

## 엔티티 상세

### Store (매장)
| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | Integer | PK, AutoIncrement | 내부 식별자 |
| identifier | String(50) | UNIQUE, NOT NULL | 외부 매장 식별자 (예: "demo-store") |
| name | String(100) | NOT NULL | 매장명 |
| created_at | DateTime | NOT NULL, default=now | 생성 시각 |

**비즈니스 의미**: 서비스에 등록된 단일 매장 단위. MVP에서는 시드 데이터로 1개만 생성.

---

### Admin (관리자)
| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | Integer | PK, AutoIncrement | 내부 식별자 |
| store_id | Integer | FK(Store.id), NOT NULL | 소속 매장 |
| username | String(50) | NOT NULL | 사용자명 |
| password_hash | String(255) | NOT NULL | bcrypt 해시 비밀번호 |
| created_at | DateTime | NOT NULL, default=now | 생성 시각 |

**제약**: (store_id, username) 조합 UNIQUE

---

### Table (테이블)
| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | Integer | PK, AutoIncrement | 내부 식별자 |
| store_id | Integer | FK(Store.id), NOT NULL | 소속 매장 |
| table_number | Integer | NOT NULL | 테이블 번호 (1, 2, 3...) |
| password | String(50) | NOT NULL | 테이블 비밀번호 (plain text) |
| current_session_id | String(36) | NOT NULL | 현재 세션 UUID |
| created_at | DateTime | NOT NULL, default=now | 생성 시각 |

**제약**: (store_id, table_number) 조합 UNIQUE  
**세션 ID**: 초기 설정 시 UUID 생성. 이용 완료 처리 시 새 UUID로 갱신.

---

### Category (카테고리)
| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | Integer | PK, AutoIncrement | 내부 식별자 |
| store_id | Integer | FK(Store.id), NOT NULL | 소속 매장 |
| name | String(50) | NOT NULL | 카테고리명 |
| sort_order | Integer | NOT NULL, default=0 | 표시 순서 |

---

### Menu (메뉴)
| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | Integer | PK, AutoIncrement | 내부 식별자 |
| store_id | Integer | FK(Store.id), NOT NULL | 소속 매장 |
| category_id | Integer | FK(Category.id), NOT NULL | 카테고리 |
| name | String(100) | NOT NULL | 메뉴명 |
| price | Integer | NOT NULL, >= 0 | 가격 (원 단위 정수) |
| description | Text | NULLABLE | 메뉴 설명 |
| image_url | String(500) | NULLABLE | 메뉴 이미지 URL |
| sort_order | Integer | NOT NULL, default=0 | 카테고리 내 표시 순서 |
| is_available | Boolean | NOT NULL, default=True | 판매 가능 여부 |

---

### Order (주문)
| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | Integer | PK, AutoIncrement | 내부 식별자 |
| store_id | Integer | FK(Store.id), NOT NULL | 소속 매장 |
| table_id | Integer | FK(Table.id), NOT NULL | 주문 테이블 |
| session_id | String(36) | NOT NULL | 주문 당시 세션 UUID |
| total_amount | Integer | NOT NULL, >= 0 | 총 주문 금액 |
| status | Enum | NOT NULL, default=PENDING | 주문 상태 |
| created_at | DateTime | NOT NULL, default=now | 주문 시각 |

**OrderStatus Enum**: `PENDING` (대기중) | `PREPARING` (준비중) | `COMPLETED` (완료)

---

### OrderItem (주문 항목)
| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | Integer | PK, AutoIncrement | 내부 식별자 |
| order_id | Integer | FK(Order.id, cascade=delete), NOT NULL | 소속 주문 |
| menu_name | String(100) | NOT NULL | 메뉴명 (주문 시점 스냅샷) |
| quantity | Integer | NOT NULL, >= 1 | 수량 |
| unit_price | Integer | NOT NULL, >= 0 | 단가 (주문 시점 스냅샷) |

**중요**: menu_name, unit_price는 주문 시점의 값을 스냅샷으로 저장 (이후 메뉴 가격 변경 영향 없음)

---

### OrderHistory (과거 주문 이력)
| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | Integer | PK, AutoIncrement | 내부 식별자 |
| store_id | Integer | FK(Store.id), NOT NULL | 소속 매장 |
| table_id | Integer | FK(Table.id), NOT NULL | 테이블 |
| session_id | String(36) | NOT NULL | 세션 UUID |
| original_order_id | Integer | NULLABLE | 원본 Order.id (참고용) |
| menu_snapshot | JSON/Text | NOT NULL | 주문 항목 JSON (메뉴명, 수량, 단가 배열) |
| total_amount | Integer | NOT NULL | 총 금액 |
| order_status | String(20) | NOT NULL | 완료 시점의 주문 상태 |
| ordered_at | DateTime | NOT NULL | 원래 주문 시각 |
| completed_at | DateTime | NOT NULL | 세션 종료(이용 완료) 시각 |

**설계 이유**: Order 테이블과 분리하여 현재 주문과 이력 데이터의 관심사 분리. 세션 종료 시 Order → OrderHistory로 이동.

---

## 상태 머신

### 주문 상태 전환

```
[생성]
  PENDING (대기중)
      |
      | 관리자 상태 변경
      v
  PREPARING (준비중)
      |
      | 관리자 상태 변경
      v
  COMPLETED (완료)

[삭제] PENDING, PREPARING 상태에서만 허용 (COMPLETED도 허용 - 관리자 직권)
```

### 테이블 세션 상태

```
[초기 설정] → session_id = UUID-A
                   |
        [첫 주문] → Order(session_id=UUID-A) 생성
        [추가 주문] → Order(session_id=UUID-A) 생성 (반복)
                   |
        [이용 완료] → Orders(session_id=UUID-A) → OrderHistory
                   → Table.current_session_id = UUID-B (새 UUID)
                   |
        [다음 손님 첫 주문] → Order(session_id=UUID-B) 생성
```
