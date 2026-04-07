from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from schemas.auth import TableLoginRequest, TableLoginResponse, AdminLoginRequest, AdminLoginResponse
import services.auth_service as auth_service

router = APIRouter(tags=["auth"])


@router.post("/auth/table-login", response_model=TableLoginResponse)
def table_login(body: TableLoginRequest, db: Session = Depends(get_db)):
    return auth_service.login_table(
        body.store_identifier, body.table_number, body.table_password, db
    )


@router.post("/auth/admin-login", response_model=AdminLoginResponse)
def admin_login(body: AdminLoginRequest, db: Session = Depends(get_db)):
    return auth_service.login_admin(
        body.store_identifier, body.username, body.password, db
    )
