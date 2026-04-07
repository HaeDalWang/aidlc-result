from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from core.config import CORS_ORIGINS
from core.sse_manager import SSEManager
from database import init_db
from routers import auth, menu, order, table, sse


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    app.state.sse_manager = SSEManager()
    yield


app = FastAPI(title="테이블오더 API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(menu.router, prefix="/api")
app.include_router(order.router, prefix="/api")
app.include_router(table.router, prefix="/api")
app.include_router(sse.router, prefix="/api")

app.mount("/customer", StaticFiles(directory="static/customer", html=True), name="customer")
app.mount("/admin", StaticFiles(directory="static/admin", html=True), name="admin")


@app.get("/")
def root():
    return {"message": "테이블오더 API 서버가 실행 중입니다", "docs": "/docs"}
