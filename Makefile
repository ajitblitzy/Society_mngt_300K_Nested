# =============================================================================
# Makefile — Ajit-backprop-test
# -----------------------------------------------------------------------------
# Convenience build / test / migrate targets for the Python 3 implementation
# of the Ajit-backprop-test project (refactored from JavaScript per AAP
# §0.5.1 and §0.8.3).
#
# This Makefile is the user-facing orchestration layer that wraps the
# underlying Python commands so the user's original npm-based workflow
# (`npm run build` / `npm run migrate --db=${DB_HOST}`) translates cleanly
# to `make build` / `make migrate`. The actual logic lives in the Python
# scripts under `scripts/` (per AAP §0.7.3 cross-cutting concerns).
#
# AAP cross-references:
#   * §0.5.1 — Unconditional file mappings (this Makefile is CREATE).
#   * §0.5.2 — Conditional pattern mappings (`package.json scripts` →
#              Makefile targets).
#   * §0.7.3 — Cross-cutting orchestration; configuration lives in
#              `src/ajit_backprop/config.py`, secrets in environment.
#   * §0.8.2 — Secrets MUST NEVER be hard-coded; only read from the
#              environment.
#   * §0.8.3 — Explicit command translations:
#                `npm run build`                       → `make build`
#                `npm run migrate --db=${DB_HOST}`     → `make migrate`
#                "include binary dependency"           → manylinux wheels
#                "API_KEY secret required for staging" → read from env
#
# Make conventions enforced in this file:
#   * SHELL := /bin/bash so recipe lines have access to bash-specific
#     features (`[[ ]]`, `set -euo pipefail`, etc.).
#   * .DEFAULT_GOAL := help so a bare `make` prints usage rather than
#     guessing at an action.
#   * .PHONY declares every non-file target so Make never confuses a target
#     name with a same-named file in the working tree (e.g., a `test/`
#     directory).
#   * Recipe lines are indented with a TAB character (Make requirement).
#   * Shell variables are escaped as `$$VAR` (Make's `$` is reserved for
#     Make variable expansion; `$$` becomes a literal `$` in the shell).
#   * `@`-prefixed lines suppress the recipe-print step (used for echo
#     statements where reprinting the command would be noise) and for
#     security-sensitive operations where the literal command must not be
#     echoed.
# =============================================================================

# -----------------------------------------------------------------------------
# Shell configuration
# -----------------------------------------------------------------------------
# Use bash explicitly for `[[ ]]` test syntax and other extensions; the
# `-e` flag aborts a recipe on the first failing command, and `-o pipefail`
# preserves non-zero exit codes through pipelines so failures surface.
SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

# -----------------------------------------------------------------------------
# Default goal
# -----------------------------------------------------------------------------
# A bare `make` invocation prints usage instead of attempting an action. This
# is safer than defaulting to `build` or `install` because those commands
# may have side effects that the user did not intend.
.DEFAULT_GOAL := help

# -----------------------------------------------------------------------------
# .PHONY declarations
# -----------------------------------------------------------------------------
# Every target below is a *task name*, not a file path — declare them PHONY
# so Make does not skip them if a same-named file or directory ever exists.
.PHONY: help install install-dev build test test-unit test-integration test-e2e \
        lint lint-ruff lint-pylint format format-ruff format-black type-check \
        check security audit migrate run clean clean-pyc clean-build clean-test \
        pre-commit pre-commit-install docker-build docker-run venv all

# -----------------------------------------------------------------------------
# Variable definitions (overridable from the command line)
# -----------------------------------------------------------------------------
# `?=` lets the user override on the command line without editing the file:
#     make PYTHON=python3.14 install
#     make PIP=pip3 install
#
# `:=` is used for values that should not be re-evaluated each time the
# variable is referenced (immediate, simple expansion).
# -----------------------------------------------------------------------------

# Python interpreter (AAP §0.6.1 — Python 3.13 stable target).
PYTHON ?= python3.13

# Pip executable. Defaults to invoking pip via the chosen Python interpreter,
# which guarantees that the install lands in the same environment that
# `make run` and `make test` will use.
PIP ?= $(PYTHON) -m pip

# Importable Python package name (PEP 8 snake_case, per AAP §0.4.1).
PACKAGE := ajit_backprop

# Distribution / project name (matches `pyproject.toml` `[project] name`,
# AAP §0.5.1). Hyphens permitted in the distribution name.
PROJECT := ajit-backprop-test

# Source and tests directories (AAP §0.4.1 canonical "src layout").
SRC := src/$(PACKAGE)
TESTS := tests
SCRIPTS := scripts

# Docker image tag (immutable image identifier; the `:latest` tag is
# convenient for local development but production deploys MUST use an
# immutable tag — see AAP §0.6.5 / Dockerfile).
DOCKER_IMAGE := $(PROJECT):latest

# Coverage reporting threshold (kept here for visibility; the actual
# threshold is enforced via `pyproject.toml` `[tool.coverage.report]`).
COV_THRESHOLD ?= 80

# =============================================================================
# Help target — self-documenting
# =============================================================================
# A bare `make` or `make help` prints the catalog of available targets so
# new contributors discover the project's workflow without reading the
# Makefile source. Each target is annotated with a one-line description.
help:
	@echo ""
	@echo "Ajit-backprop-test — Python 3 build / test / migrate targets"
	@echo "============================================================"
	@echo ""
	@echo "Setup:"
	@echo "  install           Install production dependencies (requirements.txt)"
	@echo "  install-dev       Install all dependencies (production + dev) and editable package"
	@echo "  venv              Create a Python 3.13 virtual environment in .venv/"
	@echo "  pre-commit-install  Install pre-commit Git hooks"
	@echo ""
	@echo "Build / Run:"
	@echo "  build             Build distribution wheel (replaces 'npm run build')"
	@echo "  run               Run the application entry point (python -m $(PACKAGE))"
	@echo ""
	@echo "Quality:"
	@echo "  lint              Run all linters (ruff + pylint)"
	@echo "  format            Run all formatters (ruff format + black)"
	@echo "  type-check        Run mypy in strict mode against $(SRC)"
	@echo "  check             Run lint + type-check + test (CI-equivalent)"
	@echo "  security          Run security scanners (bandit + pip-audit)"
	@echo "  pre-commit        Run all pre-commit hooks against all files"
	@echo ""
	@echo "Tests:"
	@echo "  test              Run full test suite with coverage"
	@echo "  test-unit         Run unit tests only ($(TESTS)/unit)"
	@echo "  test-integration  Run integration tests only ($(TESTS)/integration)"
	@echo "  test-e2e          Run end-to-end tests only ($(TESTS)/e2e)"
	@echo ""
	@echo "Database:"
	@echo "  migrate           Apply database migrations (DB_HOST env var REQUIRED)"
	@echo "                    Replaces 'npm run migrate --db=\$${DB_HOST}'"
	@echo ""
	@echo "Docker:"
	@echo "  docker-build      Build Docker image ($(DOCKER_IMAGE))"
	@echo "  docker-run        Run Docker container with --env-file .env"
	@echo ""
	@echo "Cleanup:"
	@echo "  clean             Remove all build artifacts and tool caches"
	@echo "  clean-pyc         Remove Python bytecode caches only"
	@echo "  clean-build       Remove distribution build artifacts only"
	@echo "  clean-test        Remove test / coverage caches only"
	@echo ""
	@echo "Convenience:"
	@echo "  all               Equivalent to: install-dev lint type-check test build"
	@echo ""
	@echo "Variables (override on command line):"
	@echo "  PYTHON=$(PYTHON)            (e.g., make PYTHON=python3.14 test)"
	@echo "  PIP=$(PIP)"
	@echo "  PACKAGE=$(PACKAGE)"
	@echo "  SRC=$(SRC)"
	@echo "  TESTS=$(TESTS)"
	@echo ""

# =============================================================================
# Setup targets
# =============================================================================

# Create a Python 3.13 virtual environment at .venv/.
# The venv is git-ignored (see .gitignore). Running this target on top of
# an existing venv is a no-op for `python -m venv` (it warns and exits 0).
venv:
	@echo "==> Creating virtual environment at .venv/ using $(PYTHON)"
	$(PYTHON) -m venv .venv
	@echo "==> Activate with: source .venv/bin/activate"

# Install production runtime dependencies pinned in requirements.txt.
# This target deliberately does NOT install the dev tooling; CI / production
# images use this target to keep the dependency surface minimal.
install:
	@echo "==> Installing production dependencies from requirements.txt"
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

# Install production + development dependencies and the project itself in
# editable mode so that local source changes are reflected without a
# reinstall. This is the recommended setup for contributors.
install-dev:
	@echo "==> Installing production + development dependencies"
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt -r requirements-dev.txt
	@echo "==> Installing project in editable mode (-e .)"
	$(PIP) install -e .

# Install pre-commit Git hooks so quality checks run on every commit.
# Idempotent — safe to re-run.
pre-commit-install:
	@echo "==> Installing pre-commit Git hooks"
	$(PYTHON) -m pre_commit install
	$(PYTHON) -m pre_commit install --hook-type pre-push

# =============================================================================
# Build target — replaces `npm run build`
# =============================================================================
# Per AAP §0.8.3: `npm run build` → `make build`, which invokes
# `python -m build` (the PEP 517 standardized package builder).
#
# `python -m build` produces both a source distribution (`*.tar.gz`) and a
# wheel (`*.whl`) under `dist/`. The build is fully isolated by default
# (PEP 517) so the host environment's installed packages do not leak into
# the build.
build:
	@echo "==> Building distribution artifacts (sdist + wheel) for $(PROJECT)"
	$(PYTHON) -m build
	@echo "==> Build complete; artifacts are in dist/"
	@ls -la dist/ 2>/dev/null || true

# =============================================================================
# Test targets
# =============================================================================
# `pytest` is the test runner per AAP §0.4.1. Coverage is collected via
# `pytest-cov`. The `--cov-report=term-missing` option prints which lines
# are uncovered, making it easy to spot gaps without opening the HTML
# report.
#
# AAP §0.8.5 validation criterion: full test suite with zero failures and
# coverage ≥ 80% (or the JS baseline if higher).
# -----------------------------------------------------------------------------

# Full suite — unit + integration + e2e — with coverage.
test:
	@echo "==> Running full pytest suite with coverage (threshold: $(COV_THRESHOLD)%)"
	$(PYTHON) -m pytest \
		--cov=$(PACKAGE) \
		--cov-report=term-missing \
		--cov-report=html \
		--cov-report=xml \
		$(TESTS)

# Unit tests only — fast, no external dependencies.
test-unit:
	@echo "==> Running unit tests ($(TESTS)/unit)"
	$(PYTHON) -m pytest --cov=$(PACKAGE) --cov-report=term-missing $(TESTS)/unit

# Integration tests — require local services (DB, etc.) but no full deployment.
test-integration:
	@echo "==> Running integration tests ($(TESTS)/integration)"
	$(PYTHON) -m pytest --cov=$(PACKAGE) --cov-report=term-missing $(TESTS)/integration

# End-to-end tests — require a deployed application stack.
test-e2e:
	@echo "==> Running end-to-end tests ($(TESTS)/e2e)"
	$(PYTHON) -m pytest $(TESTS)/e2e

# =============================================================================
# Lint / format / type-check targets
# =============================================================================
# Per AAP §0.6.3:
#   * ruff   — primary linter / formatter (consolidates flake8, isort, …).
#   * black  — opinionated formatter (defensive secondary formatter).
#   * mypy   — static type checker in strict mode.
#   * pylint — comprehensive linter (deeper checks than ruff).
# -----------------------------------------------------------------------------

# Run all linters. `ruff` is fast and covers most cases; `pylint` adds
# deeper semantic checks. Both must pass.
lint: lint-ruff lint-pylint

lint-ruff:
	@echo "==> Running ruff linter"
	$(PYTHON) -m ruff check .

lint-pylint:
	@echo "==> Running pylint on $(SRC)"
	$(PYTHON) -m pylint $(SRC) || \
		( echo "==> pylint reported issues — see output above"; exit 1 )

# Run all formatters. Run `ruff format` first (fastest) then `black` as a
# defensive secondary pass; both produce compatible output for the
# configured `line-length` so they converge.
format: format-ruff format-black
	@echo "==> Sorting imports with isort"
	$(PYTHON) -m isort $(SRC) $(TESTS) $(SCRIPTS) 2>/dev/null || \
		$(PYTHON) -m isort $(SRC) $(TESTS)

format-ruff:
	@echo "==> Running ruff format"
	$(PYTHON) -m ruff format .

format-black:
	@echo "==> Running black on $(SRC) and $(TESTS)"
	$(PYTHON) -m black $(SRC) $(TESTS)

# Strict mypy type-checking — every public function must be fully typed
# (AAP §0.8.2 implicit rule). Zero errors required.
type-check:
	@echo "==> Running mypy --strict on $(SRC)"
	$(PYTHON) -m mypy --strict $(SRC)

# Composite check target — what CI runs.
check: lint type-check test
	@echo "==> All quality checks passed"

# Security scans — bandit (static SAST) + pip-audit (CVEs in deps).
security: audit
	@echo "==> Running bandit security linter on $(SRC)"
	$(PYTHON) -m bandit -r $(SRC)

audit:
	@echo "==> Running pip-audit against requirements.txt"
	$(PYTHON) -m pip_audit -r requirements.txt

# Run all configured pre-commit hooks (defined in .pre-commit-config.yaml).
pre-commit:
	@echo "==> Running pre-commit hooks against all files"
	$(PYTHON) -m pre_commit run --all-files

# =============================================================================
# Migrate target — replaces `npm run migrate --db=${DB_HOST}`
# =============================================================================
# Per AAP §0.5.1, §0.8.3: this is the highest-fidelity translation of the
# user's instruction. The recipe below:
#
#   1. Validates that DB_HOST is set in the environment. If unset, it
#      prints a clear error and exits non-zero. The DB_HOST *value* is
#      NEVER echoed (security: AAP §0.8.2 — secrets MUST NEVER be logged).
#
#   2. Invokes `python scripts/migrate.py --db=${DB_HOST}`. The leading
#      `@` on the validation line and the explicit non-echoing make
#      target ensure the literal connection string is not printed.
#
# Make-vs-shell variable escaping: `$$DB_HOST` is the correct way to
# reference the *shell* environment variable inside a Make recipe; a
# single `$` would be interpreted by Make at parse time. The shell that
# runs the recipe sees `$DB_HOST` and substitutes the env value.
#
# To run with a one-shot override:
#     DB_HOST=postgres://user:pass@localhost/db make migrate
# To run with a pre-exported env:
#     export DB_HOST=postgres://user:pass@localhost/db && make migrate
# -----------------------------------------------------------------------------
migrate:
	@if [ -z "$${DB_HOST:-}" ]; then \
		echo "ERROR: DB_HOST environment variable is required for 'make migrate'."; \
		echo "       Set DB_HOST to your database connection string and re-run."; \
		echo "       Example: DB_HOST=postgresql://user:pass@host/db make migrate"; \
		echo "       (Value is read from the environment; never hard-code secrets.)"; \
		exit 1; \
	fi
	@echo "==> Applying database migrations (DB_HOST is set; value not displayed)"
	@$(PYTHON) $(SCRIPTS)/migrate.py --db="$${DB_HOST}"
	@echo "==> Migrations applied successfully"

# =============================================================================
# Run target — application entry point
# =============================================================================
# `python -m ajit_backprop` invokes the package's `__main__.py` module.
# Any additional arguments after `make run` are passed through via the
# `ARGS` variable; example:  `make run ARGS="--config dev"`.
# -----------------------------------------------------------------------------
run:
	@echo "==> Running $(PACKAGE) entry point"
	$(PYTHON) -m $(PACKAGE) $(ARGS)

# =============================================================================
# Clean targets
# =============================================================================
# Remove build artifacts and tool caches so the working tree returns to a
# pristine state. None of these directories are tracked in git (see
# .gitignore), so this never destroys version-controlled work.
# -----------------------------------------------------------------------------

clean: clean-build clean-pyc clean-test
	@echo "==> Workspace cleaned"

clean-build:
	@echo "==> Removing build artifacts (build/ dist/ *.egg-info)"
	@rm -rf build/ dist/
	@rm -rf *.egg-info src/*.egg-info src/$(PACKAGE).egg-info
	@find . -type d -name '*.egg-info' -not -path './.venv/*' -exec rm -rf {} + 2>/dev/null || true

clean-pyc:
	@echo "==> Removing Python bytecode caches"
	@find . -type d -name '__pycache__' -not -path './.venv/*' -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name '*.pyc' -not -path './.venv/*' -delete 2>/dev/null || true
	@find . -type f -name '*.pyo' -not -path './.venv/*' -delete 2>/dev/null || true

clean-test:
	@echo "==> Removing test / coverage / lint caches"
	@rm -rf .pytest_cache .mypy_cache .ruff_cache
	@rm -rf .coverage coverage.xml htmlcov

# =============================================================================
# Docker targets
# =============================================================================
# Per AAP §0.5.1 the Dockerfile is part of the standalone scaffold. These
# targets are convenience wrappers; production deployments should use the
# CI pipeline rather than `make docker-build` directly.
#
# `--env-file .env` feeds environment variables into the running container
# WITHOUT writing them to the image (security — secrets stay out of layers).
# The `.env` file is git-ignored; use `.env.example` as a template.
# -----------------------------------------------------------------------------

docker-build:
	@echo "==> Building Docker image $(DOCKER_IMAGE)"
	docker build -t $(DOCKER_IMAGE) .

docker-run:
	@if [ ! -f .env ]; then \
		echo "ERROR: .env file not found. Copy .env.example to .env and fill in values."; \
		exit 1; \
	fi
	@echo "==> Running Docker container $(DOCKER_IMAGE) (env file: .env)"
	docker run --rm -it --env-file .env $(DOCKER_IMAGE)

# =============================================================================
# Convenience composite — install + check + build
# =============================================================================
# Equivalent to a full local CI run; useful before opening a PR.
# -----------------------------------------------------------------------------
all: install-dev lint type-check test build
	@echo "==> 'make all' completed successfully"
