from pydantic import BaseModel


class TableLoginRequest(BaseModel):
    store_identifier: str
    table_number: int
    table_password: str


class TableLoginResponse(BaseModel):
    token: str
    table_id: int
    table_number: int
    session_id: str


class AdminLoginRequest(BaseModel):
    store_identifier: str
    username: str
    password: str


class AdminLoginResponse(BaseModel):
    token: str
    admin_id: int
    store_id: int
