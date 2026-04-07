from fastapi import Header, HTTPException, Request, status
from jose import JWTError, ExpiredSignatureError
from pydantic import BaseModel
from core.security import decode_admin_token, decode_table_token
from core.sse_manager import SSEManager


class TableAuth(BaseModel):
    table_id: int
    store_id: int
    session_id: str


class AdminAuth(BaseModel):
    admin_id: int
    store_id: int


def get_table_auth(authorization: str = Header(...)) -> TableAuth:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 인증입니다")
    token = authorization.removeprefix("Bearer ")
    try:
        payload = decode_table_token(token)
        return TableAuth(
            table_id=payload["table_id"],
            store_id=payload["store_id"],
            session_id=payload["session_id"],
        )
    except (JWTError, ValueError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 인증입니다")


def get_admin_auth(authorization: str = Header(...)) -> AdminAuth:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 인증입니다")
    token = authorization.removeprefix("Bearer ")
    try:
        payload = decode_admin_token(token)
        return AdminAuth(
            admin_id=payload["admin_id"],
            store_id=payload["store_id"],
        )
    except ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="세션이 만료되었습니다")
    except (JWTError, ValueError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 인증입니다")


def get_sse_manager(request: Request) -> SSEManager:
    return request.app.state.sse_manager
