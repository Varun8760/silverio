from decimal import Decimal

from sqlalchemy import Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SheetType(Base):
    __tablename__ = "sheet_types"
    __table_args__ = (
        UniqueConstraint("thickness_mm", "color", "finish"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    thickness_mm: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    color: Mapped[str] = mapped_column(String(100))
    finish: Mapped[str] = mapped_column(String(50))
    rate_per_sqft: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    stock_qty: Mapped[int] = mapped_column(default=0)
    low_stock_threshold: Mapped[int] = mapped_column(default=0)
    is_active: Mapped[bool] = mapped_column(default=True)