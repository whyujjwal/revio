# Architecture

## Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Monorepo                                    │
│                                                                      │
│  ┌─────────────────┐           ┌──────────────────────────────────┐  │
│  │   apps/web      │           │          apps/api                │  │
│  │                 │  HTTP/JSON│                                  │  │
│  │  Next.js 16     │◄─────────►│  FastAPI + Python 3.11           │  │
│  │  React 19       │           │  SQLAlchemy + Alembic            │  │
│  │  Tailwind 4     │           │  ChromaDB (vector memory)        │  │
│  │  App Router     │           │  Pydantic v2                     │  │
│  └────────┬────────┘           └──────────────┬───────────────────┘  │
│           │                                   │                      │
│           │ imports                           │ exports              │
│           ▼                                   ▼                      │
│  ┌────────────────────┐      ┌───────────────────────────────────┐   │
│  │ packages/ui        │      │  packages/shared-types            │   │
│  │                    │      │                                   │   │
│  │ React components   │      │  openapi.json (source of truth)   │   │
│  │ Shared across apps │      │  → TypeScript interfaces          │   │
│  └────────────────────┘      │  → Zod validation schemas         │   │
│                              └───────────────────────────────────┘   │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  skills/  — Executable scripts for agents & humans            │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

## Repository Structure

```
/
├── AGENTS.md                  # AI agent instructions (root level)
├── CLAUDE.md                  # Multi-agent coordination rules
├── package.json               # Root workspace config
├── pnpm-workspace.yaml        # pnpm workspaces
├── turbo.json                 # Turborepo task pipeline
├── pyproject.toml             # Python workspace config
├── openapi.json               # Generated — do not edit manually
│
├── apps/
│   ├── api/                   # FastAPI backend
│   │   ├── AGENTS.md          # Backend agent instructions
│   │   ├── pyproject.toml     # Python dependencies (uv)
│   │   ├── alembic.ini        # Database migration config
│   │   ├── alembic/
│   │   │   └── versions/      # Migration files
│   │   └── app/
│   │       ├── main.py        # FastAPI app entry point
│   │       ├── api/routes/    # HTTP route handlers
│   │       ├── core/
│   │       │   ├── config.py  # Settings via Pydantic
│   │       │   ├── database.py# SQLAlchemy engine + session
│   │       │   └── logging.py # Structured logger
│   │       ├── models/        # SQLAlchemy ORM models
│   │       ├── schemas/       # Pydantic request/response schemas
│   │       ├── services/      # Business logic (incl. memory)
│   │       └── scripts/       # CLI utilities
│   │
│   └── web/                   # Next.js frontend
│       ├── AGENTS.md          # Frontend agent instructions
│       ├── package.json
│       └── src/app/           # App Router pages and layouts
│
├── packages/
│   ├── shared-types/          # Auto-generated TypeScript types
│   │   └── src/
│   │       ├── schemas.ts     # Zod schemas (manually maintained)
│   │       └── index.ts       # Re-exports everything
│   └── ui/                    # Shared React components
│       └── src/
│
├── skills/                    # Executable skill scripts
│   ├── SKILLS_REGISTRY.md     # Master index of all skills
│   ├── init/                  # Template initialization
│   ├── finish/                # Lint → test → commit → push
│   ├── type-sync/             # Pydantic → OpenAPI → TypeScript
│   ├── db-migrate/            # Alembic migration runner
│   ├── dependency-add/        # Package installer (enforces pnpm/uv)
│   ├── memory/                # Agent save/recall memory
│   └── ...
│
└── docs/                      # Documentation
```

## Shared Types Pipeline

The most important architectural feature. Backend and frontend types stay in sync automatically:

```
FastAPI Pydantic schemas
         │
         ▼
 openapi.json (generated)
         │
         ▼
 packages/shared-types
         │
         ▼
TypeScript interfaces + Zod schemas
         │
         ▼
 apps/web imports @repo/shared-types
```

You never write TypeScript interfaces for API responses. They are generated. Trigger the pipeline:

```bash
bash skills/type-sync/run.sh
```

## Multi-Agent Coordination

Multiple AI agents can work in this repo simultaneously via zone ownership:

| Zone | Path | What lives here |
|------|------|-----------------|
| Backend | `apps/api/` | FastAPI, Pydantic, SQLAlchemy, migrations |
| Frontend | `apps/web/` | Next.js pages, components, hooks |
| Shared Types | `packages/shared-types/` | Auto-generated — owned by `type-sync` |
| UI Library | `packages/ui/` | Shared React components |
| Skills | `skills/` | Skill scripts |

### The Type Contract

`openapi.json` and `packages/shared-types/src/api-types.ts` are auto-generated. Do not edit manually.

- Backend agent changes a Pydantic schema → runs `type-sync`
- `type-sync` regenerates `openapi.json` and `api-types.ts`
- Frontend agent imports from `@repo/shared-types` — always up to date

### Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/) scoped to zones:

```
feat(api): add user authentication endpoint
fix(web): correct pagination on search results
chore(deps): bump fastapi to 0.116.0
```
