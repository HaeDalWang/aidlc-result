from datetime import datetime, timedelta, timezone
from jose import JWTError, ExpiredSignatureError, jwt
from passlib.context import CryptContext
from core.config import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRE_HOURS

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_admin_token(admin_id: int, store_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {
        "admin_id": admin_id,
        "store_id": store_id,
        "type": "admin",
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_table_token(table_id: int, store_id: int, session_id: str) -> str:
    payload = {
        "table_id": table_id,
        "store_id": store_id,
        "session_id": session_id,
        "type": "table",
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_admin_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "admin":
            raise ValueError("not admin token")
        return payload
    except ExpiredSignatureError:
        raise ExpiredSignatureError("세션이 만료되었습니다")
    except JWTError:
        raise JWTError("유효하지 않은 인증입니다")


def decode_table_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "table":
            raise ValueError("not table token")
        return payload
    except JWTError:
        raise JWTError("유효하지 않은 인증입니다")
