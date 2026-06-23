# Ajit-backprop-test

A test project for backprop integration, now reframed as the target of a **JavaScript/Node.js → Python migration**. This repository will host the Python re-implementation of an existing Node.js codebase, ported to improve code quality and performance while preserving the original, externally observable behavior.

> ⚠ **Blocking precondition — action required before migration can begin.**
>
> This repository currently contains **only this README** — there is **no application source code yet**, and the Python project scaffolding (configuration, dependency manifests, and tooling) described below is **planned, not yet created**. In particular, **no JavaScript/Node.js source is present to scan, diagnose, or port.**
>
> **Required user action:** add the JavaScript/Node.js source to this repository (or provide its location). Until the source is supplied, the migration plan described below is **ready to execute but not yet active** — the scan, performance diagnosis, and port cannot proceed without it.

## Objective

This project ports an existing JavaScript/Node.js application to idiomatic Python. The work decomposes into five goals:

1. **Scan** the JavaScript/Node.js codebase statically — inventory its modules, control flow, I/O patterns, data structures, and external dependencies.
2. **Diagnose** the constructs that degrade runtime performance (see [Performance & migration methodology](#performance--migration-methodology)).
3. **Port** the codebase to clean, modular, idiomatic Python.
4. **Preserve** externally observable behavior — functional parity (HTTP contracts, request/response shapes, CLI semantics) is a hard requirement, not a preference.
5. **Optimize** code quality and performance per the project rule `Ajit_refactor_Simple` — remediate the diagnosed bottlenecks rather than transcribing them.

Behavioral parity is evidenced by **porting the existing test suite to `pytest` first**, as a characterization baseline that is established before any performance rewrite.

## Planned target architecture

> **Planned/target layout.** The structure below is what the migration will instantiate; **none of it exists today**. Module names under `src/<package>/` are finalized against the actual JavaScript modules once the source is supplied — none of the files shown below (the configuration and dependency manifests, the tooling, and everything under `src/` and `tests/`) exists yet.

```text
Ajit-backprop-test/
├── pyproject.toml                      # PEP 621 metadata, deps, tool config (replaces package.json)
├── requirements.txt                    # pinned runtime deps
├── requirements-dev.txt                # pinned dev/test deps
├── .python-version                     # pins Python 3.13.x
├── .env.example                        # DB_HOST / API_KEY placeholders — NO real secrets
├── alembic.ini                         # migration config (replaces `npx run migrate`)
├── Makefile                            # build/test/run targets (replaces npm scripts)
├── .pre-commit-config.yaml             # ruff + black + isort hooks (code quality per rule)
├── README.md                           # this file
├── src/
│   └── <package>/
│       ├── __init__.py
│       ├── main.py                     # ASGI/CLI entrypoint (replaces index.js / server.js)
│       ├── config/
│       │   └── settings.py             # pydantic-settings; 12-factor env config
│       ├── api/
│       │   ├── routes.py               # route declarations (replaces Express routers)
│       │   └── handlers.py             # request handlers; thin controllers
│       ├── services/
│       │   └── <domain>_service.py     # business logic — service layer
│       ├── repositories/
│       │   └── <domain>_repository.py  # data access — repository pattern
│       ├── models/
│       │   └── <domain>.py             # domain models — Pydantic v2 & ORM classes
│       ├── db/
│       │   ├── connection.py           # async engine/session factory
│       │   └── migrations/             # Alembic revision scripts
│       └── utils/
│           └── helpers.py              # consolidated shared utilities
└── tests/
    ├── conftest.py                     # shared pytest fixtures
    ├── unit/                           # unit tests (ported from JS unit specs)
    └── integration/                    # integration tests (ported from JS integration specs)
```

**Layer mapping (Node.js → Python).** The source column lists the *typical* Node.js layers the migration expects; each is bound to its concrete file(s) once the source is supplied.

| Typical Node.js layer (source) | Python target |
| --- | --- |
| Entrypoint (`index.js` / `server.js`) | `src/<package>/main.py` |
| Express routes / controllers | `src/<package>/api/` (FastAPI) |
| Business logic / services | `src/<package>/services/` |
| Data access (Sequelize / Knex) | `src/<package>/repositories/` (SQLAlchemy 2.x) |
| Models / schemas | `src/<package>/models/` (Pydantic v2) |
| Tests (Jest / Mocha) | `tests/` (`pytest`) |

## Target technology stack

The dependency and configuration files (`requirements.txt`, `requirements-dev.txt`, `pyproject.toml`, `.python-version`, `.env.example`) are part of the **planned** project scaffolding — they are created during the migration and are **not present today**. Versions below are fixed where the Agent Action Plan verified them (June 2026) and given as safe minimums otherwise.

| Component | Version | Role (maps from) |
| --- | --- | --- |
| Python (runtime) | 3.13.x | Target runtime |
| fastapi | 0.136.1 | Web framework (Express / Koa / Fastify) |
| pydantic | 2.10.4 | Validation & serialization (Joi / Zod / ajv) |
| sqlalchemy | 2.0.36 | ORM / async data access (Sequelize / Knex / TypeORM / Prisma) |
| uvicorn | 0.34.0 | ASGI server (Node HTTP server) |
| alembic | 1.14 | Database migrations (replaces `npx run migrate`) |
| pydantic-settings | >=2.0 | Typed env configuration (removes hardcoded secrets) |
| httpx | >=0.28 | Async HTTP client (axios / node-fetch) |
| pytest (+ pytest-asyncio) | >=8.0 | Test framework (Jest / Mocha) |
| ruff + black + isort | pinned at lock time | Lint / format (ESLint / Prettier) |
| asyncpg / psycopg / aiosqlite | per database | Async DB driver (selected by the target DB) |

The npm → PyPI dependency mapping is finalized and pinned once the JavaScript manifest (`package.json`) is supplied: each declared npm package is mapped to a vetted PyPI equivalent and pinned at lock time.

## Setup, run, test & migration (planned workflow)

> **Planned workflow.** Every step below is **planned** — it becomes active **once the JavaScript source is supplied and the Python project scaffolding is created**. None of it can run today: there is no dependency manifest, application source, or test suite in the repository yet.

**1. Create a virtual environment and install dependencies**

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
```

**2. Configure environment variables**

Copy the example file and fill in values locally — **never commit real secrets**:

```bash
cp .env.example .env             # Windows: copy .env.example .env
```

`.env` supplies two variables, loaded as typed, 12-factor configuration via `pydantic-settings`:

- `DB_HOST` — database host in `host:port` form; **placeholder only** in `.env.example`.
- `API_KEY` — external/staging API key; **placeholder only** in `.env.example`.

Secrets are externalized through `pydantic-settings` and are never hardcoded in source.

**3. Run the application** *(active once the source is ported)*

```bash
uvicorn src.<package>.main:app --reload
```

`<package>` is finalized at migration time, against the actual JavaScript module names.

**4. Run the tests** *(active once the source is ported)*

```bash
pytest
```

The suite (with `pytest-asyncio` for async tests) is the parity/characterization baseline that demonstrates "the current functionality is not impacted."

**5. Apply database migrations** *(active once the source is ported)*

```bash
alembic upgrade head
```

Alembic replaces the Node `npx run migrate` step and is driven by the env-provided `DB_HOST`.

> When a `Makefile` is added during migration, the former npm scripts (`npm install` / `npm run build` / `npm run test`) are replaced by `make` targets and `[project.scripts]` entrypoints.

## Performance & migration methodology

**Expectation calibration — a language switch alone does not guarantee a speedup.** For I/O-bound workloads, Node.js is frequently competitive with Python, and a naive CPython port of a CPU-bound hot path can be *slower* than V8. Durable performance gains come from three levers applied **during the rewrite**, not from the language change itself:

- **Algorithmic remediation** — eliminate the diagnosed anti-patterns (event-loop blocking by CPU-bound work, synchronous core APIs, N+1 database queries, ReDoS-prone regexes, unbounded in-memory accumulation, inefficient data structures) rather than transcribing them.
- **Async I/O** — `asyncio` with `httpx`, an async database driver/session, and `asyncio.gather` for concurrent fan-out (optionally `uvloop` on supported platforms). FastAPI's async architecture is competitive with Node.js for I/O-bound concurrency.
- **CPU offloading** — `multiprocessing` / `ProcessPoolExecutor` or native libraries (NumPy / Cython) to bypass the GIL on compute-heavy paths.

**Safe migration order:**

1. **Port the tests first** to `pytest` as characterization tests — lock in the parity baseline.
2. **Migrate layer by layer** — entrypoint, API, services, repositories, models, db/migrations, and utilities.
3. **Benchmark before and after** (profile with `py-spy`; compare requests/second and latency percentiles) to evidence both behavioral parity and a genuine performance improvement.

The migration is delivered as a **single cohesive change set** once the JavaScript source is supplied — it is not split across multiple phases.

## Next steps

Once the JavaScript/Node.js source is available, the migration proceeds as a single cohesive change set:

1. Scan and inventory the modules and npm dependencies; map each npm package to its PyPI equivalent and pin versions.
2. Port the test suite to `pytest` to establish the characterization/parity baseline.
3. Migrate the application layer by layer into the planned `src/<package>/` structure.
4. Diagnose and remediate the performance bottlenecks; benchmark before/after to confirm both parity and improvement.

Every step above is blocked on one prerequisite, which is therefore the single action required now:

**Add the JavaScript/Node.js source to this repository (or provide its location).**
