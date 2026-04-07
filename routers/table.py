from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from core.dependencies import AdminAuth, get_admin_auth, get_sse_manager
from core.sse_manager import SSEManager
from schemas.table import TableInfo, SessionCompleteResponse, OrderHistoryGroup
import services.table_service as table_service

router = APIRouter(tags=["table"])


@router.get("/tables", response_model=list[TableInfo])
def get_tables(
    auth: AdminAuth = Depends(get_admin_auth),
    db: Session = Depends(get_db),
):
    return table_service.get_tables(auth.store_id, db)


@router.post("/tables/{table_id}/complete", response_model=SessionCompleteResponse)
async def complete_session(
    table_id: int,
    auth: AdminAuth = Depends(get_admin_auth),
    db: Session = Depends(get_db),
    sse: SSEManager = Depends(get_sse_manager),
):
    return await table_service.complete_session(table_id, auth.store_id, db, sse)


@router.get("/tables/{table_id}/history", response_model=list[OrderHistoryGroup])
def get_order_history(
    table_id: int,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    auth: AdminAuth = Depends(get_admin_auth),
    db: Session = Depends(get_db),
):
    return table_service.get_order_history(table_id, auth.store_id, date_from, date_to, db)
