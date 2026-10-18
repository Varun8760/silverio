import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator
STAFF_PAGES = ("dashboard", "orders", "stock", "colorStock", "delivery", "accounts")
GSTIN_PATTERN = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")


class CompanyCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=200)
    gst_number: str
    address: str = Field(min_length=1, max_length=500)
    state: str = Field(min_length=1, max_length=100)
    phone: str = Field(min_length=5, max_length=20)
    password: str = Field(min_length=8, max_length=72)

    @field_validator("gst_number")
    @classmethod
    def check_gst_number(cls, value: str) -> str:
        value = value.upper()
        if not GSTIN_PATTERN.match(value):
            raise ValueError("Invalid GST number. It must be 15 characters, like 27ABCDE5678F2Z6")
        return value


class CompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    gst_number: str
    address: str
    state: str
    phone: str
    is_active: bool
    created_at: datetime



class StaffCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    login_id: str = Field(min_length=3, max_length=50)
    full_name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=8, max_length=72)
    permissions: list[str] = Field(min_length=1)

    @field_validator("login_id")
    @classmethod
    def check_login_id(cls, value: str) -> str:
        value = value.upper()
        if " " in value:
            raise ValueError("Login ID cannot contain spaces")
        if GSTIN_PATTERN.match(value):
            raise ValueError("Login ID cannot look like a GST number")
        return value

    @field_validator("permissions")
    @classmethod
    def check_permissions(cls, value: list[str]) -> list[str]:
        invalid = [page for page in value if page not in STAFF_PAGES]
        if invalid:
            raise ValueError(f"Unknown pages: {', '.join(invalid)}")
        return list(dict.fromkeys(value))


class StaffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    login_id: str
    full_name: str
    role: str
    permissions: list[str]
    is_active: bool
    created_at: datetime

class ActiveUpdate(BaseModel):
    is_active: bool