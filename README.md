# Silverio

Order and production management system for Khodiyar Innovations.
Backend: FastAPI + PostgreSQL. The backend also serves the frontend.

## Setup (Windows)

1. Install [Git](https://git-scm.com), [uv](https://docs.astral.sh/uv/) and
   [PostgreSQL](https://www.postgresql.org/download/) (remember the `postgres` password).
2. Clone the repo and go into the backend folder:
   ```
   git clone <repo-url>
   cd silverio\backend
   ```
3. Install the Python libraries (uv also fetches the right Python version):
   ```
   uv sync
   ```
4. In pgAdmin, create an empty database named `silverio`.
5. Copy `.env.example` to `.env` and fill it in:
   - `DATABASE_URL`: your own Postgres password
   - `SECRET_KEY`: generate one with
     `uv run python -c "import secrets; print(secrets.token_hex(32))"`
6. Create the tables:
   ```
   uv run alembic upgrade head
   ```
7. Create your own admin login:
   ```
   uv run python seed_admin.py
   ```
8. Start the server and open http://127.0.0.1:8000 (API docs at /docs):
   ```
   uv run fastapi dev app/main.py
   ```

Run every command from the `backend` folder.

## After every `git pull`

```
uv sync
uv run alembic upgrade head
```