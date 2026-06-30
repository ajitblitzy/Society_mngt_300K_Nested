# Ajit-backprop-test

A test project for backprop integration, now scoped as a **JavaScript/Node.js → Python migration** target: the existing Node.js codebase is to be statically analyzed for performance bottlenecks and re-implemented in idiomatic Python with behavior preserved.

> ⚠ **Blocking precondition — action required before work can begin.**
>
> This repository currently contains **only this `README.md`** (no application source code).
> There is **no JavaScript source present to scan, diagnose, or port**, so the scan,
> performance diagnosis, and migration cannot proceed yet.
>
> **Required user action:** add the JavaScript/Node.js source to this repository
> (or provide its location). Until then, the migration plan described below is
> **ready-to-execute but not yet active** — it is the *planned target*, not the
> current state. Nothing in this document claims that working Python code exists today.

---

## Project Objective

The goal is to port the existing JavaScript/Node.js application to Python while improving code
quality and performance and preserving externally observable behavior. Concretely:

1. **Scan** the JavaScript/Node.js codebase — inventory its modules, control flow, I/O patterns, data structures, and external dependencies.
2. **Diagnose** the constructs that degrade runtime performance (see *Performance & Migration Methodology* below).
3. **Re-implement (port)** the codebase in clean, idiomatic Python.
4. **Preserve behavior** — functional parity with the original is a hard requirement, not a preference.
5. **Optimize quality & performance** per the project rule *"Refactor the existing code to optimize the code quality and performance"* — diagnosed bottlenecks are **remediated, not transcribed**.

Behavioral parity will be evidenced by **porting the test suite to `pytest` first**, establishing a
characterization baseline that locks in the original behavior *before* any performance rewrite.

---

## Planned Target Architecture (PLANNED — activates once the JavaScript source is supplied)

> The structure below is the **planned/target** layout. It does **not** exist in the repository
> today. The concrete module names under `src/<package>/` are finalized against the actual
> JavaScript modules once the source is provided.

```text
Ajit-backprop-test/
├── pyproject.toml                      (PEP 621 metadata, deps, tool config; replaces package.json)
├── requirements.txt                    (pinned runtime deps)
├── requirements-dev.txt                (pinned dev/test deps)
├── .python-version                     (pins Python 3.13.x)
├── .env.example                        (DB_HOST / API_KEY placeholders — NO real secrets)
├── alembic.ini                         (migration config; replaces the Node migrate step)
├── Makefile                            (build/test/run targets; replaces npm scripts)
├── .pre-commit-config.yaml             (ruff + black + isort hooks — code quality per rule)
├── Dockerfile                          (only if the JavaScript app was containerized)
├── README.md                           (this file)
├── src/
│   └── <package>/
│       ├── __init__.py
│       ├── main.py                     (ASGI/CLI entrypoint; replaces index.js / server.js)
│       ├── config/
│       │   └── settings.py             (pydantic-settings; 12-factor env config)
│       ├── api/
│       │   ├── routes.py               (route declarations; replaces Express routers)
│       │   └── handlers.py             (request handlers; thin controllers)
│       ├── services/
│       │   └── <domain>_service.py     (business logic — service layer)
│       ├── repositories/
│       │   └── <domain>_repository.py  (data access — repository pattern)
│       ├── models/
│       │   └── <domain>.py             (domain models / Pydantic & ORM classes)
│       ├── db/
│       │   ├── connection.py           (async engine/session factory)
│       │   └── migrations/             (Alembic revision scripts)
│       └── utils/
│           └── helpers.py              (consolidated shared utilities)
└── tests/
    ├── conftest.py                     (shared pytest fixtures)
    ├── unit/                           (unit tests; ported from JS unit specs)
    └── integration/                    (integration tests; ported from JS integration specs)
```

**Layer mapping (Node.js → Python):**

| Node.js layer | Python target |
|---------------|---------------|
| Entrypoint (`index.js` / `server.js`) | `src/<package>/main.py` |
| Express routes / controllers | FastAPI handlers under `src/<package>/api/` |
| Business logic / services | `src/<package>/services/` |
| Data access (Sequelize / Knex / TypeORM / Prisma) | `src/<package>/repositories/` (SQLAlchemy 2.x) |
| Models / schemas | Pydantic v2 models in `src/<package>/models/` |
| Tests (Jest / Mocha) | `pytest` suite under `tests/` |

**Planned design patterns — dependency injection (PLANNED, not implemented today):** to keep
collaborators **testable and loosely coupled**, the target wires them through **dependency
injection** rather than constructing them inline. API handlers receive their collaborators via
**FastAPI `Depends`** at the API boundary, while services, repositories, the `pydantic-settings`
configuration object, and external clients (e.g. the `httpx` client and the async database
session) are supplied through **constructor injection**. This complements the repository
pattern, service layer, and settings object shown above, and — like the rest of this
architecture — is the **planned/target** design that activates only once the JavaScript source
is supplied; none of it is implemented in the repository today.

---

## Target Technology Stack (PLANNED)

These are the recommended target packages and their verified versions. The core framework versions
are pinned; entries marked `>=` carry a safe minimum whose exact patch is fixed at lock time against
the feature set the JavaScript source actually requires.

| Component | Version | Role (maps from) |
|-----------|---------|------------------|
| Python (runtime) | 3.13.x | Target runtime |
| fastapi | 0.136.1 | Web framework (from Express/Koa/Fastify) |
| pydantic | 2.10.4 | Validation & serialization (from Joi/Zod/ajv) |
| sqlalchemy | 2.0.36 | ORM / async data access (from Sequelize/Knex/TypeORM/Prisma) |
| uvicorn | 0.34.0 | ASGI server (from the Node HTTP server) |
| alembic | 1.14 | Database migrations (replaces the Node `npx run migrate` step) |
| pydantic-settings | >=2.0 | Typed environment configuration (removes hardcoded secrets) |
| httpx | >=0.28 | Async HTTP client (from axios/node-fetch) |
| pytest (+ pytest-asyncio) | >=8.0 | Test framework (from Jest/Mocha) |
| ruff + black + isort | latest stable at lock time | Lint/format toolchain (from ESLint/Prettier) |
| asyncpg / psycopg / aiosqlite | per target DB | Async database driver (selected by the target database) |

The full **npm → PyPI dependency mapping is finalized and pinned once the JavaScript manifest
(`package.json`) is supplied** — each declared npm package is then mapped to its Python equivalent
and locked to an exact version.

---

## Setup / Run / Test / Migration (PLANNED workflow — active once the source is ported)

> The commands below describe the **planned** developer workflow. They become runnable only after
> the JavaScript source has been ported into the `src/<package>/` tree shown above.

**1. Setup** — create a virtual environment and install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
```

> Tip: `uv venv .venv --python 3.13 --seed` is a faster, drop-in alternative for creating the venv.

**2. Configuration** — copy the example environment file and fill in values **locally** (never commit
real secrets):

```bash
cp .env.example .env
```

The application reads its configuration from the environment via `pydantic-settings`. The two values
carried over from the original project — `DB_HOST` and `API_KEY` — are referenced **only** as
environment variables and appear in `.env.example` as **placeholders**. Real secret values are never
hardcoded in source and never committed to the repository.

**3. Run** — start the ASGI application with Uvicorn (`<package>` is finalized at migration time):

```bash
uvicorn src.<package>.main:app --reload
```

**4. Test** — run the ported suite, which serves as the parity / characterization baseline:

```bash
pytest            # pytest-asyncio drives the async tests
```

**5. Database migrations** — apply schema migrations with Alembic (this replaces the Node
`npx run migrate` step) and is driven by the env-provided `DB_HOST`:

```bash
alembic upgrade head
```

> A `Makefile` may expose convenience targets (e.g. `make install`, `make test`, `make run`); npm
> scripts are replaced by Makefile targets and/or `[project.scripts]` entry points in `pyproject.toml`.

---

## Performance & Migration Methodology

**Expectation calibration.** A language switch alone does **not** guarantee a performance
improvement. For I/O-bound workloads Node.js is frequently competitive, and a naive port of a
CPU-bound hot path can even be *slower* than the original. Durable gains come from three levers
applied **during the rewrite** — not from the language change itself:

- **Algorithmic remediation** — eliminate the diagnosed anti-patterns (event-loop blocking on CPU-bound work, synchronous core APIs on hot paths, N+1 database access, inefficient data structures, missing caching) rather than carrying them over.
- **Async I/O** — mirror Node.js non-blocking semantics with `asyncio`, `httpx`, and an async database driver (optionally `uvloop`); FastAPI's async architecture is competitive with Node.js for I/O-bound concurrency.
- **CPU offloading** — move compute-heavy paths to `multiprocessing` or native extensions (e.g. NumPy/Cython) to bypass the Global Interpreter Lock (GIL).

**Safe migration order.** Port the **tests first** to establish a characterization baseline →
**migrate layer by layer** (entrypoint → API → services → repositories → models) → **benchmark
before/after** (e.g. profiling with `py-spy`, comparing requests/second and latency percentiles) to
evidence both behavioral parity and a genuine performance gain. The migration is delivered as a
**single cohesive change set** once the JavaScript source is supplied.

---

## Next Steps

1. **Add the JavaScript/Node.js source to this repository (or provide its location).** This is the
   primary, blocking action — it unblocks the scan → diagnose → port workflow described above.
2. Supply the JavaScript manifest (`package.json` and any lock file) so the npm → PyPI dependency
   mapping can be finalized and pinned.
3. Confirm the target database so the async driver (`asyncpg` / `psycopg` / `aiosqlite`) is selected.
4. Once the source is present, the migration proceeds as one cohesive change set: tests are ported
   first as the parity baseline, the layers are migrated, and the diagnosed bottlenecks are
   remediated and benchmarked.
