from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import func, select

from app.core.security import hash_password
from app.dependencies import get_db, require_role
from app.models.company import Company
from app.models.user import User
from app.schemas.admin import CompanyCreate, CompanyOut, StaffCreate, StaffOut, ActiveUpdate

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_role("admin"))],
)


@router.post("/companies", response_model=CompanyOut, status_code=201)
def create_company(data: CompanyCreate, db: Session = Depends(get_db)):
    try:
        company = Company(
            name=data.name,
            gst_number=data.gst_number,
            address=data.address,
            state=data.state,
            phone=data.phone,
        )
        db.add(company)
        db.flush()

        db.add(
            User(
                login_id=data.gst_number,
                password_hash=hash_password(data.password),
                full_name=data.name,
                role="customer",
                company_id=company.id,
            )
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A company or login with this GST number already exists",
        )

    db.refresh(company)
    return company

# TODO: ask Khodiyar what details to keep for each staff member (phone,
# employee ID, joining date, etc.). If more than a name and login are
# needed, add columns to `users` or create a separate staff details table,
# then write a new migration and update StaffCreate, StaffOut and the
# Add Staff form in frontend/app.js.

@router.post("/staff", response_model=StaffOut, status_code=201)
def create_staff(data: StaffCreate, db: Session = Depends(get_db)):
    taken = db.scalar(
        select(User.id).where(func.upper(User.login_id) == data.login_id)
    )
    if taken is not None:
        raise HTTPException(status_code=409, detail="This login ID is already taken")

    staff = User(
        login_id=data.login_id,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role="staff",
        company_id=None,
        permissions=data.permissions,
    )
    db.add(staff)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This login ID is already taken")

    db.refresh(staff)
    return staff

@router.get("/staff", response_model=list[StaffOut])
def list_staff(db: Session = Depends(get_db)):
    return db.scalars(
        select(User).where(User.role == "staff").order_by(User.full_name)
    ).all()

@router.get("/companies", response_model=list[CompanyOut])
def list_companies(db:  Session= Depends(get_db)):
    return db.scalars(select(Company).order_by(Company.name)).all()

@router.patch("/companies/{company_id}", response_model=CompanyOut)
def set_company_active(
    company_id: int, data: ActiveUpdate, db: Session = Depends(get_db)
):
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    company.is_active = data.is_active
    db.commit()
    db.refresh(company)
    return company


@router.patch("/staff/{user_id}", response_model=StaffOut)
def set_staff_active(
    user_id: int, data: ActiveUpdate, db: Session = Depends(get_db)
):
    staff = db.get(User, user_id)
    if staff is None or staff.role != "staff":
        raise HTTPException(status_code=404, detail="Staff member not found")
    staff.is_active = data.is_active
    db.commit()
    db.refresh(staff)
    return staff