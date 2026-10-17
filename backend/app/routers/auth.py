from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.dependencies import get_current_user, get_db
from app.models.company import Company
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def authenticate(db: Session, login_id: str, password: str) -> User:
    user = db.scalar(select(User).where(User.login_id == login_id))

    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid login ID or password")

    company_active = True
    if user.company_id is not None:
        company = db.get(Company, user.company_id)
        company_active = company is not None and company.is_active

    if not user.is_active or not company_active:
        raise HTTPException(status_code=403, detail="This account is disabled")

    return user


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate(db, data.login_id, data.password)
    return TokenResponse(
        access_token=create_access_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.post("/token", include_in_schema=False)
def token_for_swagger(
    form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = authenticate(db, form.username, form.password)
    return {"access_token": create_access_token(user.id), "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user