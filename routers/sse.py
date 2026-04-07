from fastapi import APIRouter, Query, HTTPException, status, Depends, Request
from fastapi.responses import StreamingResponse
from jose import JWTError
from core.security import decode_admin_token, decode_table_token
from core.sse_manager import SSEManager
from core.dependencies import get_sse_manager

router = APIRouter(tags=["sse"])

_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


@router.get("/sse/admin")
async def admin_sse(
    token: str = Query(..., description="JWT 토큰 (EventSource는 헤더 미지원)"),
    sse: SSEManager = Depends(get_sse_manager),
):
    try:
        payload = decode_admin_token(token)
        store_id = payload["store_id"]
    except (JWTError, KeyError, Exception):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 인증입니다")
    return StreamingResponse(
        sse.subscribe_admin(store_id),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


@router.get("/sse/table/{table_id}")
async def table_sse(
    table_id: int,
    token: str = Query(..., description="테이블 토큰 (EventSource는 헤더 미지원)"),
    sse: SSEManager = Depends(get_sse_manager),
):
    try:
        payload = decode_table_token(token)
        auth_table_id = payload["table_id"]
    except (JWTError, KeyError, Exception):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 인증입니다")
    return StreamingResponse(
        sse.subscribe_table(auth_table_id),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )
