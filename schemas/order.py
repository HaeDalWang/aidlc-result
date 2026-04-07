from datetime import datetime
from pydantic import BaseModel
from models.order import OrderStatus


class OrderItemInput(BaseModel):
    menu_id: int
    menu_name: str
    quantity: int
    unit_price: int


class CreateOrderRequest(BaseModel):
    items: list[OrderItemInput]


class OrderItemResponse(BaseModel):
    id: int
    menu_name: str
    quantity: int
    unit_price: int

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: int
    table_id: int
    session_id: str
    total_amount: int
    status: OrderStatus
    created_at: datetime
    items: list[OrderItemResponse]

    model_config = {"from_attributes": True}


class UpdateStatusRequest(BaseModel):
    status: OrderStatus


class DeleteResponse(BaseModel):
    success: bool
    deleted_order_id: int


class TableOrderSummary(BaseModel):
    table_id: int
    table_number: int
    total_amount: int
    orders: list[OrderResponse]
