import uuid
from database import SessionLocal, init_db
from models.store import Store, Admin, Table
from models.menu import Category, Menu
from core.security import hash_password


def get_or_create(db, model, defaults=None, **kwargs):
    instance = db.query(model).filter_by(**kwargs).first()
    if instance:
        return instance, False
    params = {**kwargs, **(defaults or {})}
    instance = model(**params)
    db.add(instance)
    db.flush()
    return instance, True


def run():
    init_db()
    db = SessionLocal()
    try:
        # Store
        store, _ = get_or_create(db, Store, identifier="demo-store", defaults={"name": "데모 매장"})

        # Admin
        get_or_create(db, Admin, store_id=store.id, username="admin",
                      defaults={"password_hash": hash_password("admin1234")})

        # Tables
        for i in range(1, 6):
            get_or_create(db, Table, store_id=store.id, table_number=i,
                          defaults={"password": str(i) * 4, "current_session_id": str(uuid.uuid4())})

        # Categories
        cat_main, _ = get_or_create(db, Category, store_id=store.id, name="메인 메뉴", defaults={"sort_order": 1})
        cat_drink, _ = get_or_create(db, Category, store_id=store.id, name="음료", defaults={"sort_order": 2})
        cat_side, _ = get_or_create(db, Category, store_id=store.id, name="사이드", defaults={"sort_order": 3})

        # Menus
        main_menus = [
            {"name": "김치찌개", "price": 9000, "description": "국내산 김치로 끓인 얼큰한 찌개", "sort_order": 1},
            {"name": "된장찌개", "price": 8000, "description": "구수한 된장으로 끓인 전통 찌개", "sort_order": 2},
            {"name": "비빔밥",   "price": 10000, "description": "신선한 채소와 고추장 비빔밥", "sort_order": 3},
            {"name": "불고기",   "price": 12000, "description": "달콤한 양념의 소불고기", "sort_order": 4},
        ]
        drink_menus = [
            {"name": "콜라",   "price": 2000, "description": "시원한 콜라 355ml", "sort_order": 1},
            {"name": "사이다", "price": 2000, "description": "청량한 사이다 355ml", "sort_order": 2},
            {"name": "오렌지주스", "price": 3000, "description": "100% 오렌지 주스", "sort_order": 3},
        ]
        side_menus = [
            {"name": "공기밥", "price": 1000, "description": "갓 지은 흰 쌀밥", "sort_order": 1},
            {"name": "계란말이", "price": 4000, "description": "부드러운 계란말이", "sort_order": 2},
        ]

        for m in main_menus:
            get_or_create(db, Menu, store_id=store.id, category_id=cat_main.id, name=m["name"],
                          defaults={"price": m["price"], "description": m["description"], "sort_order": m["sort_order"]})
        for m in drink_menus:
            get_or_create(db, Menu, store_id=store.id, category_id=cat_drink.id, name=m["name"],
                          defaults={"price": m["price"], "description": m["description"], "sort_order": m["sort_order"]})
        for m in side_menus:
            get_or_create(db, Menu, store_id=store.id, category_id=cat_side.id, name=m["name"],
                          defaults={"price": m["price"], "description": m["description"], "sort_order": m["sort_order"]})

        db.commit()
        print("✅ 시드 데이터 생성 완료")
        print(f"   매장 식별자: demo-store")
        print(f"   관리자 계정: admin / admin1234")
        print(f"   테이블: 1번(1111) ~ 5번(5555)")
        print(f"   메뉴: {len(main_menus)}개 메인 + {len(drink_menus)}개 음료 + {len(side_menus)}개 사이드")
    finally:
        db.close()


if __name__ == "__main__":
    run()
