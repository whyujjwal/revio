# Docker

The monorepo ships with a production-ready Docker setup. One command starts the entire stack.

## Services

| Service | Image | Port | Volume |
|---------|-------|------|--------|
| `api` | Built from `apps/api/Dockerfile` | 8000 | `chromadb_data:/app/.data/chromadb` |
| `postgres` | `postgres:16-alpine` | 5432 | `postgres_data:/var/lib/postgresql/data` |

Both services have health checks. The API waits for Postgres to be healthy before starting.

## Commands

```bash
# Start everything (builds images if needed)
bash skills/docker/run.sh up

# Run Alembic migrations inside the API container
bash skills/docker/run.sh migrate

# Tail all logs
bash skills/docker/run.sh logs

# Tail logs for one service
bash skills/docker/run.sh logs api
bash skills/docker/run.sh logs postgres

# Stop containers (data volumes preserved)
bash skills/docker/run.sh down

# Rebuild images without starting
bash skills/docker/run.sh build

# Open an interactive shell inside the API container
bash skills/docker/run.sh shell

# Destroy everything including volumes (all data gone)
bash skills/docker/run.sh reset
```

## Connecting to Postgres

**Via Docker:**
```bash
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
```

**From a local client (port 5432 is exposed):**
```
postgresql://<user>:<pass>@localhost:5432/<db>
```

Credentials default to your project slug (set during `init`). Override via `.env`:
```bash
cp .env.example .env
# Edit POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
```

## Context Versioning with Entire

[Entire](https://entire.dev) hooks into git and snapshots AI agent reasoning alongside every commit.

```bash
# Creates a git commit + Entire context snapshot
bash skills/checkpoint/run.sh "finished user auth"

# Browse history
entire log
entire diff <id>
```
