from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, func, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "(role = 'customer') = (company_id IS NOT NULL)",
            name="ck_users_customer_has_company",
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    login_id: Mapped[str] = mapped_column(String(50), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(200))

    # TODO: before Step 4 (admin creates staff), send Claude the add-staff
    # form from the prototype HTML (the permission checkboxes). If staff get
    # ticked permissions instead of one fixed role, add a `permissions`
    # column in a new migration. Also confirm the final role names with Khodiyar.
    role: Mapped[str] = mapped_column(String(30))
    company_id: Mapped[int | None] = mapped_column(
        ForeignKey("companies.id"), unique=True
    )
    permissions: Mapped[list[str]] = mapped_column(
        ARRAY(String(30)), default=list, server_default=text("'{}'")
    )
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )