from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from core.dependencies import TableAuth, AdminAuth, get_table_auth, get_admin_auth, get_sse_manager
from core.sse_manager import SSEManager

router = APIRouter(tags=["sse"])

_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


@router.get("/sse/admin")
async def admin_sse(
    auth: AdminAuth = Depends(get_admin_auth),
    sse: SSEManager = Depends(get_sse_manager),
):
    return StreamingResponse(
        sse.subscribe_admin(auth.store_id),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


@router.get("/sse/table/{table_id}")
async def table_sse(
    table_id: int,
    auth: TableAuth = Depends(get_table_auth),
    sse: SSEManager = Depends(get_sse_manager),
):
    return StreamingResponse(
        sse.subscribe_table(auth.table_id),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )
