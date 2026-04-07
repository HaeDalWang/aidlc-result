from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models.store import Store, Admin, Table
from core.security import verify_password, create_admin_token, create_table_token
from schemas.auth import TableLoginResponse, AdminLoginResponse

_AUTH_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="자격 증명이 올바르지 않습니다",
)


def login_table(
    store_identifier: str,
    table_number: int,
    table_password: str,
    db: Session,
) -> TableLoginResponse:
    store = db.query(Store).filter(Store.identifier == store_identifier).first()
    if not store:
        raise _AUTH_ERROR

    table = (
        db.query(Table)
        .filter(Table.store_id == store.id, Table.table_number == table_number)
        .first()
    )
    if not table or table.password != table_password:
        raise _AUTH_ERROR

    token = create_table_token(table.id, store.id, table.current_session_id)
    return TableLoginResponse(
        token=token,
        table_id=table.id,
        table_number=table.table_number,
        session_id=table.current_session_id,
    )


def login_admin(
    store_identifier: str,
    username: str,
    password: str,
    db: Session,
) -> AdminLoginResponse:
    store = db.query(Store).filter(Store.identifier == store_identifier).first()
    if not store:
        raise _AUTH_ERROR

    admin = (
        db.query(Admin)
        .filter(Admin.store_id == store.id, Admin.username == username)
        .first()
    )
    if not admin or not verify_password(password, admin.password_hash):
        raise _AUTH_ERROR

    token = create_admin_token(admin.id, store.id)
    return AdminLoginResponse(token=token, admin_id=admin.id, store_id=store.id)
