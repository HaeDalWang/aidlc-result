from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models.order import Order, OrderItem, OrderStatus
from schemas.order import (
    CreateOrderRequest, OrderResponse, OrderItemResponse,
    DeleteResponse, TableOrderSummary,
)
from core.sse_manager import SSEManager
from models.store import Table


_VALID_TRANSITIONS = {
    OrderStatus.PENDING: [OrderStatus.PREPARING],
    OrderStatus.PREPARING: [OrderStatus.COMPLETED],
    OrderStatus.COMPLETED: [],
}


def _to_response(order: Order) -> OrderResponse:
    return OrderResponse(
        id=order.id,
        table_id=order.table_id,
        session_id=order.session_id,
        total_amount=order.total_amount,
        status=order.status,
        created_at=order.created_at,
        items=[OrderItemResponse.model_validate(i) for i in order.items],
    )


async def create_order(
    table_id: int,
    store_id: int,
    session_id: str,
    body: CreateOrderRequest,
    db: Session,
    sse: SSEManager,
) -> OrderResponse:
    if not body.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="주문 항목이 없습니다")
    for item in body.items:
        if item.quantity < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="수량은 1 이상이어야 합니다")
        if item.unit_price < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="가격은 0 이상이어야 합니다")

    total = sum(i.quantity * i.unit_price for i in body.items)
    order = Order(store_id=store_id, table_id=table_id, session_id=session_id, total_amount=total)
    db.add(order)
    db.flush()

    for item in body.items:
        db.add(OrderItem(
            order_id=order.id,
            menu_name=item.menu_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
        ))
    db.commit()
    db.refresh(order)

    resp = _to_response(order)
    await sse.publish_to_admin(store_id, {"type": "new_order", "order": resp.model_dump(mode="json")})
    return resp


def get_orders_by_session(table_id: int, session_id: str, db: Session) -> list[OrderResponse]:
    orders = (
        db.query(Order)
        .filter(Order.table_id == table_id, Order.session_id == session_id)
        .order_by(Order.created_at)
        .all()
    )
    return [_to_response(o) for o in orders]


async def update_order_status(
    order_id: int,
    store_id: int,
    new_status: OrderStatus,
    db: Session,
    sse: SSEManager,
) -> OrderResponse:
    order = db.query(Order).filter(Order.id == order_id, Order.store_id == store_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다")

    if new_status not in _VALID_TRANSITIONS[order.status]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="유효하지 않은 상태 전환입니다")

    order.status = new_status
    db.commit()
    db.refresh(order)

    resp = _to_response(order)
    event = {"type": "order_updated", "order_id": order.id, "status": new_status.value, "table_id": order.table_id}
    await sse.publish_to_admin(store_id, event)
    await sse.publish_to_table(order.table_id, event)
    return resp


async def delete_order(
    order_id: int,
    store_id: int,
    db: Session,
    sse: SSEManager,
) -> DeleteResponse:
    order = db.query(Order).filter(Order.id == order_id, Order.store_id == store_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다")

    table_id = order.table_id
    db.delete(order)
    db.commit()

    await sse.publish_to_admin(store_id, {"type": "order_deleted", "order_id": order_id, "table_id": table_id})
    return DeleteResponse(success=True, deleted_order_id=order_id)


def get_all_tables_summary(store_id: int, db: Session) -> list[TableOrderSummary]:
    tables = (
        db.query(Table)
        .filter(Table.store_id == store_id)
        .order_by(Table.table_number)
        .all()
    )
    result = []
    for table in tables:
        orders = (
            db.query(Order)
            .filter(Order.table_id == table.id, Order.session_id == table.current_session_id)
            .order_by(Order.created_at.desc())
            .all()
        )
        total = sum(o.total_amount for o in orders)
        result.append(TableOrderSummary(
            table_id=table.id,
            table_number=table.table_number,
            total_amount=total,
            orders=[_to_response(o) for o in orders],
        ))
    return result
