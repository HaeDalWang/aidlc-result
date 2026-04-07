from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class TableInfo(BaseModel):
    id: int
    table_number: int
    current_session_id: str

    model_config = {"from_attributes": True}


class SessionCompleteResponse(BaseModel):
    success: bool
    new_session_id: str


class OrderHistoryItemResponse(BaseModel):
    menu_name: str
    quantity: int
    unit_price: int


class OrderHistoryResponse(BaseModel):
    id: int
    session_id: str
    original_order_id: Optional[int]
    items: list[OrderHistoryItemResponse]
    total_amount: int
    order_status: str
    ordered_at: datetime
    completed_at: datetime


class OrderHistoryGroup(BaseModel):
    session_id: str
    completed_at: datetime
    orders: list[OrderHistoryResponse]
