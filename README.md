# Ajit-backprop-test

Test project for backprop integration — an idiomatic, type-checked,
performance-tuned, and fully tested Python 3 codebase built on the
Python 3.13 runtime, a `src/`-layout package structure, and modern
Python tooling.

> **Project intent:** This is a test project for backprop integration.
> All build, install, run, test, and migration commands described below
> use Python tooling exclusively; there is no transpiler, no bundler,
> and no separate compile step in the operational toolchain.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration (Environment Variables)](#configuration-environment-variables)
- [Build](#build)
- [Database Migrations](#database-migrations)
- [Testing](#testing)
- [Linting, Formatting, and Type Checking](#linting-formatting-and-type-checking)
- [Run / Entry Point](#run--entry-point)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Notes / About](#notes--about)

---

## Tech Stack

| Layer                  | Tool / Library                | Purpose                                                  |
| ---------------------- | ----------------------------- | -------------------------------------------------------- |
| Runtime                | **Python 3.13**               | Highest currently stable interpreter (pinned in `.python-version`) |
| Package installer      | `pip` (bundled) or `uv`       | Dependency management                                    |
| Build backend          | `setuptools` + `build`        | PEP 517 / PEP 518 wheel builds                            |
| Test runner            | `pytest` (+ `pytest-asyncio`, `pytest-cov`, `pytest-mock`, `pytest-xdist`) | Unit, integration, and end-to-end tests |
| Linter                 | `ruff`                        | Fast linting (consolidates many legacy linters)          |
| Formatter              | `ruff format` / `black`       | Code formatting                                          |
| Import sorter          | `isort`                       | Deterministic import ordering                            |
| Type checker           | `mypy` (`--strict`)           | Static type analysis                                     |
| Comprehensive linter   | `pylint`                      | Deeper static analysis                                   |
| Security linter        | `bandit`                      | Security-focused static analysis                         |
| Dependency audit       | `pip-audit`                   | CVE scanning of installed dependencies                   |
| Pre-commit hooks       | `pre-commit`                  | Runs the linters/formatters on every commit              |
| Database toolkit       | `SQLAlchemy 2.x`              | ORM and Core SQL toolkit                                 |
| Database migrations    | `alembic`                     | Versioned, idempotent schema migrations                  |
| Validation / config    | `pydantic`, `pydantic-settings` | Typed data models and environment-driven configuration |
| Async HTTP             | `httpx`                       | Async-capable HTTP client                                |
| Logging                | `loguru` / `structlog`        | Structured, ergonomic logging                            |
| Numerical compute      | `numpy`, `torch` (where used) | Vectorized math and tensor / autograd primitives         |
| Container image        | `python:3.13-slim`            | Production base image declared in `Dockerfile`           |
| Task runner            | `make`                        | Convenience wrappers for the commands below              |

---

## Requirements

- **Python 3.13** — the project targets Python 3.13 explicitly; this is the
  highest currently stable Python release. The required version is pinned
  via the `.python-version` file at the repository root, and enforced in
  `pyproject.toml` via `requires-python = ">=3.13"`.
- **`pip`** — bundled with Python 3.13. Used to install the project and its
  dependencies from `requirements.txt` and `requirements-dev.txt`.
- **`uv`** *(optional)* — a faster drop-in alternative to `pip` for
  dependency installation. Use `uv pip install -r requirements.txt` if
  installed.
- **`make`** *(optional but recommended)* — used to invoke the convenience
  targets exposed by the `Makefile` (e.g., `make build`, `make test`,
  `make migrate`).
- **Operating system** — Linux, macOS, or Windows. All third-party Python
  dependencies that include compiled C extensions (e.g., `numpy`,
  `psycopg`, `cryptography`, `lxml`, `torch`, `pillow`) are distributed as
  pre-built **manylinux**, **macOS**, and **Windows** wheels, so
  `pip install -r requirements.txt` does not require a local C/C++
  compiler in normal use.
- **Database** — any database supported by SQLAlchemy is acceptable; the
  default development driver is PostgreSQL (`psycopg`). The connection
  URI is provided via the `DB_HOST` environment variable (see
  [Configuration](#configuration-environment-variables)).
- **Docker** *(optional)* — required only if you want to run the
  containerized image declared by the `Dockerfile`.

> **Binary-dependency note:** the project relies exclusively on
> dependencies that publish pre-built wheels for the target platforms,
> so installation does not invoke a local compiler. This satisfies the
> "include binary dependency" requirement by construction. If your
> platform requires building any wheel from source, install the system
> headers your platform documents (e.g.,
> `apt-get install -y build-essential libpq-dev` on Debian/Ubuntu) and
> then re-run `pip install -r requirements.txt`.

---

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd Ajit-backprop-test
```

### 2. Create and activate a virtual environment

```bash
python3.13 -m venv .venv

# macOS / Linux
source .venv/bin/activate

# Windows (PowerShell)
# .venv\Scripts\Activate.ps1

# Windows (cmd.exe)
# .venv\Scripts\activate.bat
```

### 3. Upgrade `pip` and install dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
pip install -r requirements-dev.txt   # optional — required for tests, linting, and type checking
```

If you prefer `uv` (substantially faster):

```bash
uv pip install --upgrade pip
uv pip install -r requirements.txt
uv pip install -r requirements-dev.txt
```

### 4. (Optional) Install the project in editable mode

Editable installs make the package importable as `ajit_backprop` while
allowing in-place edits to take effect immediately:

```bash
pip install -e .
```

### 5. (Optional) Install via the Makefile

The `Makefile` wraps the steps above in a single target:

```bash
make install        # production dependencies only
make install-dev    # production + development dependencies
```

Run `make help` to see every available target.

---

## Configuration (Environment Variables)

The project reads all configuration from environment variables. No secret
values are ever stored in the source tree. The canonical template lives
at the repository root in `.env.example`.

### Required variables

| Variable   | Required When                                  | Description                                                                        |
| ---------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `DB_HOST`  | Running migrations or any database operation   | SQLAlchemy connection URI consumed by `scripts/migrate.py` and the runtime data layer. |
| `API_KEY`  | Staging deployments (per project setup notes)  | Authentication token for the upstream API the application talks to.                |

### Setting variables locally

Copy the template, then edit the resulting `.env` file with your local
values:

```bash
cp .env.example .env
# Edit .env in your preferred editor:
#   $EDITOR .env
```

A typical `.env` file looks like the following (the values shown are
**placeholders only** — never commit real credentials):

```dotenv
# Connection URI — adjust scheme, host, port, database, and credentials
# to match your environment.
DB_HOST=postgresql://user:pass@host:5432/dbname

# Issued by your platform's secret manager.
API_KEY=replace-with-staging-api-key
```

> **Security:** `.env` is listed in `.gitignore` and MUST NEVER be
> committed. Never hard-code real credentials anywhere in the source
> tree, in logs, or in commit messages. The application reads values
> from `os.environ` at runtime via `pydantic-settings`.

If you prefer not to use a `.env` file, export the variables directly
before invoking any command:

```bash
export DB_HOST="postgresql://user:pass@host:5432/dbname"
export API_KEY="replace-with-staging-api-key"
```

---

## Build

The project produces a standard Python wheel (`.whl`) and source
distribution (`.tar.gz`) in the `dist/` folder. Python 3.13 runs source
files directly, so there is no transpilation, bundling, minification, or
asset pipeline.

### Primary command (recommended)

```bash
make build
```

### Direct equivalents

```bash
python -m build                 # standardized PEP 517 build → dist/*.whl + dist/*.tar.gz
python scripts/build.py         # convenience wrapper around `python -m build`
```

### Verifying the build

```bash
ls -la dist/
# ajit_backprop-<version>-py3-none-any.whl
# ajit-backprop-test-<version>.tar.gz
```

---

## Database Migrations

Schema migrations are managed with Alembic and are **idempotent** —
re-running a migration that has already been applied is a no-op. The
connection target is taken from the `DB_HOST` environment variable.

### Primary command (recommended)

```bash
make migrate
```

`make migrate` invokes `python scripts/migrate.py --db=${DB_HOST}` under
the hood.

### Direct equivalents

```bash
# Explicit script form — accepts --db on the command line:
python scripts/migrate.py --db=${DB_HOST}

# Native Alembic form — relies on DB_HOST being exported:
alembic upgrade head
```

### Generating a new migration

```bash
alembic revision --autogenerate -m "describe the schema change"
```

Inspect the generated file under `src/ajit_backprop/db/migrations/`
before committing. Then apply it with `make migrate`.

### Rolling back

```bash
alembic downgrade -1            # one revision back
alembic downgrade base          # all the way to the empty schema
```

---

## Testing

The test suite uses `pytest` and lives under `tests/`. Tests are split
into `unit/`, `integration/`, and `e2e/` subfolders, each with its own
`__init__.py`. Shared fixtures live in `tests/conftest.py`.

### Run all tests

```bash
make test
# or, equivalently:
pytest
```

### Run with coverage

```bash
pytest --cov=ajit_backprop --cov-report=term-missing
```

### Run a single layer

```bash
make test-unit
make test-integration
pytest tests/e2e/        # end-to-end suite
```

### Run a single test by name

```bash
pytest tests/unit/test_foo.py::TestFoo::test_specific_behavior
```

### Parallel execution

`pytest-xdist` is installed; pass `-n auto` to use all available cores:

```bash
pytest -n auto
```

---

## Linting, Formatting, and Type Checking

The project enforces consistent style and static-typing discipline.

### Lint

```bash
make lint                # runs both ruff and pylint
ruff check .             # ruff alone
pylint src/ajit_backprop # pylint alone
```

### Format

```bash
make format              # runs ruff format + black + isort as configured
ruff format .            # ruff alone
black .                  # black alone
isort .                  # isort alone
```

### Type-check

```bash
make type-check          # mypy --strict over src/ajit_backprop
mypy --strict src/ajit_backprop
```

### Combined check (lint + type-check + tests)

```bash
make check
```

### Security audit

```bash
make security            # invokes pip-audit and bandit
pip-audit                # dependency CVE scan
bandit -r src/ajit_backprop  # security-focused static analysis
```

---

## Run / Entry Point

The package exposes a `__main__.py` so it can be invoked with
`python -m`:

```bash
python -m ajit_backprop
```

If you installed the project in editable mode (`pip install -e .`), the
console-script entry points declared in `pyproject.toml` are also on
your `PATH`.

### Via the Makefile

```bash
make run
```

### Via Docker

```bash
docker build -t ajit-backprop-test .
docker run --rm --env-file .env ajit-backprop-test
```

The `Dockerfile` uses `python:3.13-slim` as its base image.

---

## Project Structure

The repository follows the standard `src/` layout recommended by the
Python Packaging Authority. Translated modules from any earlier
implementation live under the appropriately named sub-package
(`core/`, `models/`, `services/`, `utils/`, `api/`, `db/`).

```
Ajit-backprop-test/
├── pyproject.toml                       PEP 621 project metadata, build backend, embedded tool configs
├── requirements.txt                     Pinned production dependencies
├── requirements-dev.txt                 Pinned development / test dependencies
├── .python-version                      Pins the interpreter to "3.13"
├── .gitignore                           Python-aware ignore rules
├── .pre-commit-config.yaml              Hooks: ruff, black, mypy, end-of-file-fixer, etc.
├── .env.example                         Environment-variable template (DB_HOST, API_KEY)
├── Dockerfile                           Production image (python:3.13-slim)
├── Makefile                             Convenience targets: install, build, test, migrate, lint, format, run, clean
├── alembic.ini                          Alembic configuration (reads DB_HOST)
├── README.md                            This file
├── .github/
│   └── workflows/
│       ├── ci.yml                       Lint + type-check + test on push/PR
│       └── build.yml                    Wheel build pipeline
├── src/
│   └── ajit_backprop/                   Importable Python package (snake_case)
│       ├── __init__.py                  Public API re-exports
│       ├── __main__.py                  Entry point — invoked by `python -m ajit_backprop`
│       ├── core/                        Core domain logic
│       ├── models/                      Pydantic / dataclass data models
│       ├── services/                    Business-logic service layer
│       ├── utils/                       Utility helpers
│       ├── api/                         HTTP / API surface
│       └── db/
│           ├── connection.py            Connection factory (reads DB_HOST)
│           └── migrations/              Alembic migration scripts
├── tests/
│   ├── conftest.py                      Shared pytest fixtures
│   ├── unit/                            Fast, isolated unit tests
│   ├── integration/                     Cross-component / external-dependency tests
│   └── e2e/                             Full end-to-end tests
├── scripts/
│   ├── migrate.py                       Alembic wrapper invoked by `make migrate`
│   └── build.py                         Wheel build helper invoked by `make build`
└── docs/
    ├── architecture.md                  Module structure and data flow
    ├── api.md                           Public API surface documentation
    └── migration_from_javascript.md     One-time refactor notes
```

### Top-level annotations

- **`pyproject.toml`** — single source of truth for project metadata,
  dependencies (with compatible-release operators), and tool
  configuration (`[tool.ruff]`, `[tool.black]`, `[tool.isort]`,
  `[tool.mypy]`, `[tool.pytest.ini_options]`, `[tool.coverage]`,
  `[tool.pylint]`, `[tool.bandit]`).
- **`requirements.txt`** / **`requirements-dev.txt`** — exact-version
  pins for reproducible installs in CI and Docker.
- **`Makefile`** — one-line shortcuts for every common task.
- **`Dockerfile`** — multi-stage build on `python:3.13-slim` producing
  a minimal runtime image.
- **`alembic.ini`** + **`src/ajit_backprop/db/migrations/`** —
  versioned schema migrations.
- **`src/ajit_backprop/`** — the importable package; the `src/` layout
  prevents accidental imports of in-tree modules that have not been
  installed.
- **`tests/`** — `pytest` test suite split by layer.
- **`scripts/`** — operational helpers wrapping `python -m build` and
  `alembic upgrade head`.
- **`docs/`** — design and reference documentation.

---

## Development Workflow

### 1. Install the development environment

```bash
make install-dev
```

### 2. Install pre-commit hooks

```bash
pre-commit install
```

This installs Git hooks that automatically run `ruff`, `black`,
`mypy`, and several baseline hygiene hooks (end-of-file-fixer,
trailing-whitespace, etc.) before each commit.

### 3. Run all hooks against the entire repository

```bash
pre-commit run --all-files
```

### 4. Make changes, then validate locally

```bash
make check          # lint + type-check + tests
```

### 5. Commit and push

```bash
git add -p
git commit -m "feat: describe the change"
git push
```

### 6. Continuous Integration

Every push and pull request triggers the workflows under
`.github/workflows/`:

- **`ci.yml`** — sets up Python 3.13, installs dependencies, runs
  `ruff check .`, `mypy --strict src/ajit_backprop`, and the full
  `pytest` suite.
- **`build.yml`** — produces a distributable wheel via
  `python -m build`.

### Modern Python features in use

- Native type hints throughout (PEP 484, PEP 604 `X | Y` unions, PEP 695
  type aliases where appropriate).
- `async`/`await` coroutines for I/O-bound paths, orchestrated by
  `asyncio.run` at the application boundary.
- Context managers (`with` statements, PEP 343) for every resource
  (file handles, sockets, database connections) to prevent leaks.
- `dataclass` / `pydantic.BaseModel` for typed data shapes.
- f-strings and structural pattern matching where they improve clarity.

---

## Notes / About

This is a **test project for backprop integration.** The implementation
is written in Python 3 and uses the modern Python tooling and ecosystem
listed in [Tech Stack](#tech-stack). Where the project performs numeric
or backpropagation work, it leverages NumPy and (where applicable)
PyTorch tensors with autograd, taking advantage of vectorized and
GPU-accelerated execution.

For module-by-module architecture documentation see
[`docs/architecture.md`](docs/architecture.md), and for the public
API surface see [`docs/api.md`](docs/api.md). Refactor history and
migration notes — including the language-construct mapping, the
dependency substitution table, and the proactive defect remediation
rules — are documented in
[`docs/migration_from_javascript.md`](docs/migration_from_javascript.md).

### Quick reference

| Task                       | Command                                              |
| -------------------------- | ---------------------------------------------------- |
| Create venv                | `python3.13 -m venv .venv && source .venv/bin/activate` |
| Install runtime deps       | `pip install -r requirements.txt`                    |
| Install dev deps           | `pip install -r requirements-dev.txt`                |
| Build wheel                | `make build` (or `python -m build`)                  |
| Run migrations             | `make migrate` (or `python scripts/migrate.py --db=${DB_HOST}`) |
| Run all tests              | `pytest` (or `make test`)                            |
| Lint                       | `ruff check .` (or `make lint`)                      |
| Format                     | `ruff format .` (or `make format`)                   |
| Type-check                 | `mypy --strict src/ajit_backprop` (or `make type-check`) |
| Run the application        | `python -m ajit_backprop` (or `make run`)            |
| Build container image      | `docker build -t ajit-backprop-test .`               |
| Run container              | `docker run --rm --env-file .env ajit-backprop-test` |
