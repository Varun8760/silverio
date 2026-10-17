from getpass import getpass

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import company, order, sheet_type, user  # noqa: F401
from app.models.user import User


def main() -> None:
    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.role == "admin"))
        if existing is not None:
            print(f"An admin already exists ({existing.login_id}). Nothing to do.")
            return

        login_id = input("Admin login ID: ").strip()
        full_name = input("Full name: ").strip()
        password = getpass("Password (min 8 characters): ")
        confirm = getpass("Repeat password: ")

        if not login_id or not full_name:
            print("Login ID and full name are required.")
            return
        if len(password) < 8 or len(password.encode()) > 72:
            print("Password must be at least 8 characters and at most 72 bytes.")
            return
        if password != confirm:
            print("Passwords do not match.")
            return
        if db.scalar(select(User).where(User.login_id == login_id)) is not None:
            print("That login ID is already taken.")
            return

        db.add(
            User(
                login_id=login_id,
                password_hash=hash_password(password),
                full_name=full_name,
                role="admin",
                company_id=None,
                is_active=True,
            )
        )
        db.commit()
        print(f"Admin '{login_id}' created.")
    finally:
        db.close()


if __name__ == "__main__":
    main()