# Revio

A production-ready monorepo template for **human and AI agent collaboration**. Next.js + FastAPI + shared types pipeline + agent memory + skills system — all wired together.

## Use as a Template

```bash
git clone https://github.com/YOUR_ORG/revio.git my-project
cd my-project
bash skills/init/run.sh
```

The init script prompts for your project name, package scope, and description, then renames everything across the repo. Non-interactive mode:

```bash
PROJECT_NAME="My App" PROJECT_SLUG="my-app" PACKAGE_SCOPE="myorg" DESCRIPTION="My SaaS platform" \
  bash skills/init/run.sh
```

## Quick Start

### Option A — Docker (recommended)

```bash
bash skills/docker/run.sh up       # Start API + PostgreSQL
bash skills/docker/run.sh migrate  # Apply database migrations
```

- **API** → `http://localhost:8000`
- **Swagger UI** → `http://localhost:8000/docs`

### Option B — Local dev

**Prerequisites:** Node 20+, pnpm 10+, Python 3.11+, [uv](https://astral.sh/uv)

```bash
make setup   # Copy .env files + install deps
pnpm dev     # Start frontend (3000) + backend (8000)
```

## What's Inside

```
apps/web/              → Next.js 16, React 19, Tailwind, App Router
apps/api/              → FastAPI, Pydantic v2, SQLAlchemy, Alembic, ChromaDB
packages/shared-types/ → Auto-generated TS types from OpenAPI
packages/ui/           → Shared React components
skills/                → Executable scripts for agents & humans
docs/                  → Detailed documentation
```

## Skills

Skills are bash scripts that encode repeatable operations into single commands. Agents discover them via `skills/SKILLS_REGISTRY.md`.

| Skill | Command | When |
|-------|---------|------|
| `init` | `bash skills/init/run.sh` | First clone — customize the template |
| `finish` | `bash skills/finish/run.sh "msg"` | Every task completion (lint, test, commit, push) |
| `type-sync` | `bash skills/type-sync/run.sh` | After changing Pydantic schemas |
| `db-migrate` | `bash skills/db-migrate/run.sh "msg"` | After changing SQLAlchemy models |
| `docker` | `bash skills/docker/run.sh up\|down` | Manage the Docker stack |
| `memory` | `bash skills/memory/run.sh save\|recall` | Agent memory via ChromaDB |
| `dependency-add` | `bash skills/dependency-add/run.sh js\|py <pkg>` | Add packages (enforces pnpm/uv) |
| `checkpoint` | `bash skills/checkpoint/run.sh "msg"` | Version agent context |
| `lint-fix` | `bash skills/lint-fix/run.sh` | Lint and auto-fix |
| `test-run` | `bash skills/test-run/run.sh` | Run test suites |
| `deploy` | `bash skills/deploy/run.sh api\|web` | Manual deploy to GCP Cloud Run |
| `prd-workflow` | `bash skills/prd-workflow/run.sh init` | Structured feature dev (PRD → tasks) |

## Key Concepts

**Shared types pipeline** — Change a Pydantic model in the backend, run `type-sync`, and the frontend gets updated TypeScript types automatically. No manual type definitions.

**Agent memory** — ChromaDB-powered semantic search. Agents save decisions and recall them across sessions. Fully local, no external APIs.

**Multi-agent coordination** — Zone ownership boundaries, file lock conventions, and commit scoping let multiple AI agents work simultaneously without conflicts.

## Docs

| Topic | Link |
|-------|------|
| Architecture & repo structure | [docs/architecture.md](docs/architecture.md) |
| Backend deep dive | [docs/backend.md](docs/backend.md) |
| Frontend deep dive | [docs/frontend.md](docs/frontend.md) |
| Agent memory system | [docs/memory.md](docs/memory.md) |
| Docker & deployment | [docs/docker.md](docs/docker.md) |
| Environment variables | [docs/environment.md](docs/environment.md) |

## Make Targets

```bash
make help          # All targets
make setup         # First-time: copy .env files, install deps
make dev           # Start dev servers
make test          # Run all tests
make lint          # Lint and fix
make deploy-api    # Emergency manual deploy (requires gcloud auth)
```
