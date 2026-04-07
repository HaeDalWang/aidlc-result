from sqlalchemy.orm import Session
from models.menu import Category, Menu
from schemas.menu import CategoryWithMenus, MenuResponse


def get_menus_by_category(store_id: int, db: Session) -> list[CategoryWithMenus]:
    categories = (
        db.query(Category)
        .filter(Category.store_id == store_id)
        .order_by(Category.sort_order)
        .all()
    )
    menus = (
        db.query(Menu)
        .filter(Menu.store_id == store_id, Menu.is_available == True)  # noqa: E712
        .order_by(Menu.sort_order)
        .all()
    )
    menu_map: dict[int, list[Menu]] = {}
    for menu in menus:
        menu_map.setdefault(menu.category_id, []).append(menu)

    result = []
    for cat in categories:
        result.append(
            CategoryWithMenus(
                id=cat.id,
                name=cat.name,
                sort_order=cat.sort_order,
                menus=[MenuResponse.model_validate(m) for m in menu_map.get(cat.id, [])],
            )
        )
    return result
