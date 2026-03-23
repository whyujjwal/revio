# Backend — FastAPI

The backend is a **FastAPI** application using Python 3.11+.

## Key Libraries

- `fastapi` — HTTP framework with automatic OpenAPI generation
- `pydantic v2` — Data validation and settings management
- `sqlalchemy 2.0` — ORM for relational data
- `alembic` — Database schema migrations
- `chromadb` — Local vector database for agent memory
- `uvicorn` — ASGI server

## Configuration

All configuration lives in `app/core/config.py` using **Pydantic Settings**. It reads from environment variables and `.env` files automatically.

```python
from app.core.config import settings

print(settings.DATABASE_URL)
print(settings.MEMORY_DB_PATH)
print(settings.DEBUG)
```

Never hardcode config values. Never use `os.environ.get()` directly. Always go through `settings`.

## Structured Logging

The logging system produces human-readable colored output in development and machine-parseable JSON in production.

```python
from app.core.logging import get_logger

logger = get_logger(__name__)

# Basic
logger.info("user signed up")

# With structured fields (show up as JSON keys in production)
logger.info("payment processed", user_id=42, amount_cents=1999, currency="USD")

# Warnings and errors
logger.warning("rate limit approaching", requests_remaining=5)
logger.error("payment failed", order_id="abc", exc_info=True)
```

**Never use `print()`**. It bypasses log levels and structured output. Switch to JSON output in production by setting `LOG_JSON=true`.

## Database Layer

SQLAlchemy 2.0 with synchronous sessions.

**Defining a model:**

```python
# apps/api/app/models/user.py
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(100))
```

**Import it** in `app/models/__init__.py` so Alembic can discover it:

```python
from app.models.user import User  # noqa: F401
```

**Create the migration:**

```bash
bash skills/db-migrate/run.sh "add users table"
```

**Using the DB in routes:**

```python
from sqlalchemy.orm import Session
from fastapi import Depends
from app.core.database import get_db

@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()
```

## Adding an Endpoint

**1. Define Pydantic schemas** in `app/schemas/`:

```python
# app/schemas/user.py
from pydantic import BaseModel

class UserCreateRequest(BaseModel):
    email: str
    name: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
```

**2. Add to** `app/schemas/__init__.py`:

```python
from app.schemas.user import UserCreateRequest, UserResponse
__all__ = [..., "UserCreateRequest", "UserResponse"]
```

**3. Write the route** in `app/api/routes/users.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.logging import get_logger
from app.schemas.user import UserCreateRequest, UserResponse
from app.models.user import User

logger = get_logger(__name__)
router = APIRouter(prefix="/users")

@router.post("/", response_model=UserResponse)
def create_user(req: UserCreateRequest, db: Session = Depends(get_db)):
    user = User(email=req.email, name=req.name)
    db.add(user)
    db.commit()
    logger.info("user created", email=req.email)
    return user
```

**4. Register the router** in `app/api/routes/__init__.py`:

```python
from app.api.routes import health, memory, users
api_router.include_router(users.router, tags=["users"])
```

**5. Sync the types:**

```bash
bash skills/type-sync/run.sh
```

The frontend now has TypeScript types for `UserCreateRequest` and `UserResponse`.
