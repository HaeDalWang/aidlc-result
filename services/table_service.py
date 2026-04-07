import json
import uuid
from typing import Optional
from datetime import date, datetime, timezone, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models.store import Table
from models.order import Order
from models.order_history import OrderHistory
from schemas.table import (
    TableInfo, SessionCompleteResponse,
    OrderHistoryResponse, OrderHistoryItemResponse, OrderHistoryGroup,
)
from core.sse_manager import SSEManager


def get_tables(store_id: int, db: Session) -> list[TableInfo]:
    tables = (
        db.query(Table)
        .filter(Table.store_id == store_id)
        .order_by(Table.table_number)
        .all()
    )
    return [TableInfo.model_validate(t) for t in tables]


async def complete_session(
    table_id: int,
    store_id: int,
    db: Session,
    sse: SSEManager,
) -> SessionCompleteResponse:
    table = db.query(Table).filter(Table.id == table_id, Table.store_id == store_id).first()
    if not table:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="테이블을 찾을 수 없습니다")

    current_orders = (
        db.query(Order)
        .filter(Order.table_id == table_id, Order.session_id == table.current_session_id)
        .all()
    )

    completed_at = datetime.now(timezone.utc)
    for order in current_orders:
        snapshot = [
            {"menu_name": i.menu_name, "quantity": i.quantity, "unit_price": i.unit_price}
            for i in order.items
        ]
        db.add(OrderHistory(
            store_id=store_id,
            table_id=table_id,
            session_id=table.current_session_id,
            original_order_id=order.id,
            menu_snapshot=json.dumps(snapshot, ensure_ascii=False),
            total_amount=order.total_amount,
            order_status=order.status.value,
            ordered_at=order.created_at,
            completed_at=completed_at,
        ))
        db.delete(order)

    new_session_id = str(uuid.uuid4())
    table.current_session_id = new_session_id
    db.commit()

    await sse.publish_to_admin(store_id, {
        "type": "session_completed",
        "table_id": table_id,
        "new_session_id": new_session_id,
    })
    return SessionCompleteResponse(success=True, new_session_id=new_session_id)


def get_order_history(
    table_id: int,
    store_id: int,
    date_from: Optional[date],
    date_to: Optional[date],
    db: Session,
) -> list[OrderHistoryGroup]:
    table = db.query(Table).filter(Table.id == table_id, Table.store_id == store_id).first()
    if not table:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="테이블을 찾을 수 없습니다")

    query = db.query(OrderHistory).filter(
        OrderHistory.table_id == table_id,
        OrderHistory.store_id == store_id,
    )
    if date_from:
        query = query.filter(OrderHistory.completed_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.filter(OrderHistory.completed_at < datetime.combine(date_to + timedelta(days=1), datetime.min.time()))

    histories = query.order_by(OrderHistory.completed_at.desc()).all()

    groups: dict[str, OrderHistoryGroup] = {}
    for h in histories:
        items = [OrderHistoryItemResponse(**item) for item in json.loads(h.menu_snapshot)]
        order_resp = OrderHistoryResponse(
            id=h.id,
            session_id=h.session_id,
            original_order_id=h.original_order_id,
            items=items,
            total_amount=h.total_amount,
            order_status=h.order_status,
            ordered_at=h.ordered_at,
            completed_at=h.completed_at,
        )
        if h.session_id not in groups:
            groups[h.session_id] = OrderHistoryGroup(
                session_id=h.session_id,
                completed_at=h.completed_at,
                orders=[],
            )
        groups[h.session_id].orders.append(order_resp)

    return list(groups.values())
