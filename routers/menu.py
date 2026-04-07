from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from core.dependencies import TableAuth, get_table_auth
from schemas.menu import CategoryWithMenus
import services.menu_service as menu_service

router = APIRouter(tags=["menu"])


@router.get("/menus", response_model=list[CategoryWithMenus])
def get_menus(
    auth: TableAuth = Depends(get_table_auth),
    db: Session = Depends(get_db),
):
    return menu_service.get_menus_by_category(auth.store_id, db)
