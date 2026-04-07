from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from core.dependencies import TableAuth, AdminAuth, get_table_auth, get_admin_auth, get_sse_manager
from core.sse_manager import SSEManager
from schemas.order import (
    CreateOrderRequest, OrderResponse, UpdateStatusRequest,
    DeleteResponse, TableOrderSummary,
)
import services.order_service as order_service

router = APIRouter(tags=["order"])


@router.post("/orders", response_model=OrderResponse)
async def create_order(
    body: CreateOrderRequest,
    auth: TableAuth = Depends(get_table_auth),
    db: Session = Depends(get_db),
    sse: SSEManager = Depends(get_sse_manager),
):
    return await order_service.create_order(
        auth.table_id, auth.store_id, auth.session_id, body, db, sse
    )


@router.get("/orders/table/{table_id}", response_model=list[OrderResponse])
def get_table_orders(
    table_id: int,
    auth: TableAuth = Depends(get_table_auth),
    db: Session = Depends(get_db),
):
    return order_service.get_orders_by_session(auth.table_id, auth.session_id, db)


@router.get("/orders/summary", response_model=list[TableOrderSummary])
def get_tables_summary(
    auth: AdminAuth = Depends(get_admin_auth),
    db: Session = Depends(get_db),
):
    return order_service.get_all_tables_summary(auth.store_id, db)


@router.patch("/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    body: UpdateStatusRequest,
    auth: AdminAuth = Depends(get_admin_auth),
    db: Session = Depends(get_db),
    sse: SSEManager = Depends(get_sse_manager),
):
    return await order_service.update_order_status(order_id, auth.store_id, body.status, db, sse)


@router.delete("/orders/{order_id}", response_model=DeleteResponse)
async def delete_order(
    order_id: int,
    auth: AdminAuth = Depends(get_admin_auth),
    db: Session = Depends(get_db),
    sse: SSEManager = Depends(get_sse_manager),
):
    return await order_service.delete_order(order_id, auth.store_id, db, sse)
