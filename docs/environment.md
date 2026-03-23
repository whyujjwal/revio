# Environment Variables

## Backend — `apps/api/.env`

Copy from `apps/api/.env.example`.

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_NAME` | Set during `init` | Displayed in API docs |
| `APP_VERSION` | `0.1.0` | Displayed in API docs |
| `DEBUG` | `false` | Enables SQLAlchemy query logging |
| `DATABASE_URL` | `sqlite:///./dev.db` | SQLAlchemy connection string |
| `MEMORY_DB_PATH` | `.data/chromadb` | Path for ChromaDB vector store |
| `LOG_LEVEL` | `INFO` | Logging threshold (DEBUG/INFO/WARNING/ERROR) |
| `LOG_JSON` | `false` | Set `true` in production for JSON log output |

## Docker Compose — `.env`

Copy from `.env.example` at the repo root.

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | Set during `init` | Postgres username |
| `POSTGRES_PASSWORD` | Set during `init` | Postgres password |
| `POSTGRES_DB` | Set during `init` | Postgres database name |
| `LOG_LEVEL` | `INFO` | API log level inside Docker |
| `DEBUG` | `false` | API debug mode inside Docker |

## Frontend — `apps/web/.env.local`

Copy from `apps/web/.env.example`.

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API URL |

## Production `DATABASE_URL`

```
DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/dbname
```
