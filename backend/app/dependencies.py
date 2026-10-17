from collections.abc import Callable, Iterator

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import decode_access_token
from app.models.company import Company
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)

def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if token is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if user.company_id is not None:
        company = db.get(Company, user.company_id)
        if company is None or not company.is_active:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user
def require_role(*roles: str) -> Callable[..., User]:
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=403, detail="You do not have permission to do this"
            )
        return user

    return checker