from typing import Optional
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class OrderHistory(Base):
    __tablename__ = "order_history"
    __table_args__ = (
        Index("idx_history_table_completed", "table_id", "completed_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    store_id: Mapped[int] = mapped_column(Integer, ForeignKey("stores.id"), nullable=False)
    table_id: Mapped[int] = mapped_column(Integer, ForeignKey("tables.id"), nullable=False)
    session_id: Mapped[str] = mapped_column(String(36), nullable=False)
    original_order_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    menu_snapshot: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    total_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    order_status: Mapped[str] = mapped_column(String(20), nullable=False)
    ordered_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
