# syntax=docker/dockerfile:1.7
# =============================================================================
# Dockerfile — Ajit-backprop-test (Python 3.13)
# -----------------------------------------------------------------------------
# Production container image for the Python 3 implementation of the
# Ajit-backprop-test project (refactored from JavaScript per AAP §0.5.1).
#
# Replaces any prior Node-based Dockerfile (per AAP §0.5.2 conditional
# pattern: `FROM node:*` → `FROM python:3.13-slim`; `npm install` →
# `pip install -r requirements.txt`).
#
# Multi-stage build (builder + runtime) is used to keep the final image
# small while still allowing C-extension Python packages (`psycopg`,
# `numpy`, `torch`) to compile from source if a manylinux wheel is ever
# unavailable on a given platform. In practice the AAP §0.6.5 binary
# dependency policy and the pinned versions in `requirements.txt` mean
# all wheels install pre-built — the build-essential / libpq-dev tools
# in the builder stage are a fallback safety net only.
#
# AAP cross-references for every design decision in this file:
#   * §0.4.1 — `python:3.13-slim` mandated as base image; `src/` layout.
#   * §0.5.1 — `CMD ["python", "-m", "ajit_backprop"]` mandated.
#   * §0.5.2 — Node Dockerfile → Python Dockerfile transformation.
#   * §0.6.1 — Python 3.13 (latest maintenance: 3.13.13) target.
#   * §0.6.5 — Binary dependency note (manylinux wheels preferred;
#              build-essential as fallback only).
#   * §0.7.3 — Cross-cutting: configuration via environment variables;
#              `os.environ` is the only secret source.
#   * §0.8.2 — Reproducible builds: pin base image to specific patch tag
#              (no `python:latest`, no `python:3.13`); pin
#              `requirements.txt` to exact versions.
#   * §0.8.3 — Secrets via `--env-file` at runtime, NEVER in image
#              layers; `DB_HOST` / `API_KEY` read from `os.environ`.
#
# Build:  `docker build -t ajit-backprop-test:latest .`
# Run:    `docker run --rm --env-file .env ajit-backprop-test:latest`
# Inspect:`docker history --no-trunc ajit-backprop-test:latest`
#         (verify NO secrets appear in any layer — AAP §0.8.2)
# =============================================================================


# =============================================================================
# Build arguments (override at build time with `--build-arg KEY=VALUE`)
# -----------------------------------------------------------------------------
# These ARGs are declared GLOBAL (before the first FROM) so each stage can
# reference the same defaults via `ARG` (without re-declaration the values
# would not be visible inside any stage — Dockerfile semantic).
# =============================================================================

# Pinned to 3.13.13 (the highest stable maintenance release per AAP §0.6.1)
# rather than the floating `3.13-slim` tag, so re-builds at different times
# yield byte-identical base layers (AAP §0.8.2 reproducible-build directive).
ARG PYTHON_VERSION=3.13.13

# Non-root user identity (UID 1000 / GID 1000 are the conventional default
# for the first interactive user on Linux; matching them keeps file
# ownership predictable when bind-mounting host directories).
ARG APP_UID=1000
ARG APP_GID=1000

# Application install location inside the container. Note: this is the
# *container's* internal `/app` and is wholly distinct from the Blitzy
# platform's host-side `/app/` security exclusion (AAP §0.3.2). Inside
# the container `/app` is the conventional working directory.
ARG APP_HOME=/app

# Virtual-environment location inside the container. Putting the venv at
# `/opt/venv` (a path outside the application root) lets us ship the
# venv from the builder stage to the runtime stage with a single
# `COPY --from=builder /opt/venv /opt/venv` instruction.
ARG VENV_PATH=/opt/venv


# =============================================================================
# Stage 1 — builder
# -----------------------------------------------------------------------------
# The builder stage installs system build tools and Python packages into a
# self-contained virtual environment. Only the venv (and the application
# source) is propagated to the runtime stage; the build tools themselves
# are discarded, which keeps the final image lean.
# =============================================================================
FROM python:${PYTHON_VERSION}-slim AS builder

# Re-declare ARGs needed inside this stage. Without re-declaration the
# global ARGs above are not visible to RUN / COPY instructions in the
# stage (Dockerfile semantic — global ARGs propagate as defaults but
# must be `ARG`-imported into each stage that uses them).
ARG APP_HOME
ARG VENV_PATH

# -----------------------------------------------------------------------------
# Builder environment variables
# -----------------------------------------------------------------------------
# `PYTHONDONTWRITEBYTECODE=1` — do not emit `.pyc` files (smaller image
#   and avoids stale-bytecode footguns).
# `PYTHONUNBUFFERED=1` — flush stdout/stderr immediately so logs appear
#   in `docker logs` without buffering delays.
# `PIP_NO_CACHE_DIR=1` — disable pip's local cache (we never re-install
#   in the same stage; the cache would just bloat the layer).
# `PIP_DISABLE_PIP_VERSION_CHECK=1` — silence the "new pip available"
#   nag that adds noise to build logs.
# `PIP_DEFAULT_TIMEOUT=120` — give pip extra time to download large
#   wheels (e.g., `torch` is ~700 MB) over slower CI networks.
# `VIRTUAL_ENV` + `PATH` — activate the venv for every RUN below by
#   prepending its bin directory to PATH (this is what `source bin/activate`
#   does at the shell level, but Dockerfile RUNs cannot run that script
#   persistently — the ENV form is the canonical workaround).
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=120 \
    VIRTUAL_ENV=${VENV_PATH} \
    PATH="${VENV_PATH}/bin:${PATH}"

# -----------------------------------------------------------------------------
# System build dependencies
# -----------------------------------------------------------------------------
# Installed in a SINGLE RUN to keep the layer count down and so the apt
# cache deletion (`rm -rf /var/lib/apt/lists/*`) lands in the same layer
# as the install — otherwise the cache files persist in earlier layers
# and inflate the image size even after deletion (AAP §0.8.2 image-size
# discipline implied by the slim base choice).
#
# Selected packages and their purpose:
#   * `build-essential`     — gcc, g++, make, libc-dev for compiling C
#                              extensions if a wheel is unavailable
#                              (AAP §0.6.5 binary-dependency fallback).
#   * `libpq-dev`           — PostgreSQL client headers; required only if
#                              `psycopg` falls back to a source build
#                              (the binary wheel ships its own libpq, but
#                              this header package is harmless insurance).
#   * `git`                 — needed by some `pip install` cases that
#                              resolve VCS URLs in transitive deps.
#   * `ca-certificates`     — TLS root certificates (required for HTTPS
#                              pulls from PyPI on minimal base images).
#   * `--no-install-recommends` — skip "recommended" but non-essential
#                              packages (keeps the builder lean even
#                              though it is discarded post-build).
# `set -eux` makes the recipe fail on the first error AND echoes each
# command before execution (helpful for debugging build failures).
RUN set -eux \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        git \
        libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# Create and populate the virtual environment
# -----------------------------------------------------------------------------
# The venv lives at $VIRTUAL_ENV (= $VENV_PATH = /opt/venv). Creating it
# explicitly (rather than installing system-wide) gives a clean, self-
# contained tree that we can copy verbatim into the runtime stage with
# a single `COPY --from=builder` instruction.
RUN set -eux \
    && python -m venv "${VIRTUAL_ENV}" \
    && "${VIRTUAL_ENV}/bin/python" -m pip install --upgrade pip setuptools wheel

# -----------------------------------------------------------------------------
# Working directory for the application source
# -----------------------------------------------------------------------------
WORKDIR ${APP_HOME}

# -----------------------------------------------------------------------------
# Dependency installation (LAYER CACHE OPTIMIZATION)
# -----------------------------------------------------------------------------
# Copying ONLY `requirements.txt` first makes the long, expensive pip
# install layer cache-friendly: as long as `requirements.txt` is byte-
# identical between builds, Docker reuses this layer even when the
# application source has changed. This shaves several minutes off
# rebuild time during development.
#
# `requirements.txt` carries exact `==` pins (AAP §0.6.6, §0.8.2) so
# `pip install -r requirements.txt` is deterministic.
COPY requirements.txt ./

RUN set -eux \
    && pip install --no-cache-dir -r requirements.txt

# -----------------------------------------------------------------------------
# Application source
# -----------------------------------------------------------------------------
# Copied AFTER the dependency layer so frequent source-only changes do
# not invalidate the dependency cache. The source set mirrors the AAP
# §0.4.1 / §0.5.1 layout: `pyproject.toml`, `README.md`, `src/`,
# `scripts/`, and `alembic.ini` are the canonical project artifacts.
#
# `README.md` is required because `pyproject.toml` references it via
# `readme = "README.md"`; omitting it makes `pip install .` fail with
# a "readme not found" error.
COPY pyproject.toml ./
COPY README.md ./
COPY alembic.ini ./
COPY src/ ./src/
COPY scripts/ ./scripts/

# -----------------------------------------------------------------------------
# Install the project itself (no-deps)
# -----------------------------------------------------------------------------
# `--no-deps` because every dependency was already pinned-installed from
# `requirements.txt` above; re-resolving here would double-download and
# could pull a different transitive set than the one we audited.
#
# Non-editable install: in a production image we want a normal site-
# packages install (no `-e .`), which means the package is reachable via
# `python -m ajit_backprop` without setting `PYTHONPATH`.
RUN set -eux \
    && pip install --no-cache-dir --no-deps .


# =============================================================================
# Stage 2 — runtime
# -----------------------------------------------------------------------------
# A fresh `python:3.13.13-slim` base receives only the venv from the
# builder stage plus a minimal set of runtime shared libraries. None of
# the build-essential / libpq-dev / git tools cross over, which is the
# primary size win of this multi-stage approach.
# =============================================================================
FROM python:${PYTHON_VERSION}-slim AS runtime

# Re-declare ARGs needed inside this stage.
ARG APP_HOME
ARG APP_UID
ARG APP_GID
ARG VENV_PATH
ARG PYTHON_VERSION

# -----------------------------------------------------------------------------
# OCI image labels (production metadata)
# -----------------------------------------------------------------------------
# Labels follow the open-container.org image-spec annotations so registry
# UIs (ghcr.io, Docker Hub, Harbor) display correct provenance. These
# replace the implicit metadata an `npm publish` would have produced
# from `package.json` (AAP §0.5.2 mapping).
LABEL org.opencontainers.image.title="ajit-backprop-test" \
      org.opencontainers.image.description="Test project for backprop integration (Python 3 implementation)." \
      org.opencontainers.image.source="https://github.com/Ajit/Ajit-backprop-test" \
      org.opencontainers.image.url="https://github.com/Ajit/Ajit-backprop-test" \
      org.opencontainers.image.documentation="https://github.com/Ajit/Ajit-backprop-test/blob/main/README.md" \
      org.opencontainers.image.licenses="Proprietary" \
      org.opencontainers.image.base.name="docker.io/library/python:${PYTHON_VERSION}-slim" \
      org.opencontainers.image.vendor="Ajit"

# -----------------------------------------------------------------------------
# Runtime environment variables
# -----------------------------------------------------------------------------
# Same predictable-Python settings as the builder, plus `PYTHONFAULTHANDLER=1`
# which dumps a Python-level traceback on segfault / SIGSEGV (helpful when
# C extensions like `torch` or `numpy` crash) and `PYTHONHASHSEED=random`
# which keeps hash-flooding mitigations active in long-running processes.
#
# `VIRTUAL_ENV` + `PATH` activate the copied venv (no `bin/activate`
# script is sourced; we set the env directly).
#
# CRITICAL: NO secret values appear in this ENV block — `DB_HOST` and
# `API_KEY` are passed at runtime via `--env-file` / `--env` flags or
# Docker secrets, NEVER baked into the image (AAP §0.8.2 / §0.8.3).
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    VIRTUAL_ENV=${VENV_PATH} \
    PATH="${VENV_PATH}/bin:${PATH}" \
    APP_HOME=${APP_HOME}

# -----------------------------------------------------------------------------
# Runtime system libraries
# -----------------------------------------------------------------------------
# At runtime we need only the *shared* library equivalents of the build
# headers used in the builder stage:
#   * `libpq5`           — PostgreSQL client shared lib for `psycopg`
#                          (the wheel ships its own copy but this is
#                          extra insurance for source-built fallbacks).
#   * `ca-certificates`  — TLS root certificates so HTTPS calls from the
#                          application (e.g., to external APIs identified
#                          by `API_KEY`) succeed.
#   * `tini`             — Tiny init system used as PID 1 (see ENTRYPOINT
#                          below). Reaps zombie processes and forwards
#                          SIGTERM/SIGINT correctly to the Python
#                          process so `docker stop` triggers graceful
#                          shutdown rather than the 10-second SIGKILL
#                          fallback.
RUN set -eux \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        libpq5 \
        tini \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# Non-root user (security best practice)
# -----------------------------------------------------------------------------
# Running the application as `root` in a container is a long-standing
# anti-pattern: any container-escape exploit becomes a host-root
# compromise. We create a system user/group with stable IDs (`--system`
# allocates from the system range and excludes the user from the
# `/etc/passwd` "regular user" listing where appropriate).
#
# `--create-home` ensures `$HOME` exists for libraries that write to
# `~/.cache` or `~/.config` at runtime (e.g., matplotlib, torch hub).
RUN set -eux \
    && groupadd --system --gid "${APP_GID}" appgroup \
    && useradd --system --uid "${APP_UID}" --gid "${APP_GID}" \
               --shell /bin/bash --create-home --home-dir /home/appuser \
               appuser \
    && mkdir -p "${APP_HOME}" \
    && chown -R appuser:appgroup "${APP_HOME}"

# -----------------------------------------------------------------------------
# Working directory
# -----------------------------------------------------------------------------
WORKDIR ${APP_HOME}

# -----------------------------------------------------------------------------
# Copy the virtual environment from the builder stage
# -----------------------------------------------------------------------------
# The venv contains every Python package required at runtime AND the
# installed `ajit_backprop` package itself. Copying it from the builder
# avoids re-running pip at runtime stage, which keeps the runtime layer
# small and removes the need for `pip` / `build-essential` here.
#
# `--chown=appuser:appgroup` ensures the appuser owns the venv (so
# write-access tools like pip-audit could be run inside the container if
# ever needed; not required for normal `python -m ajit_backprop` reads).
COPY --from=builder --chown=appuser:appgroup ${VENV_PATH} ${VENV_PATH}

# -----------------------------------------------------------------------------
# Copy application source from the builder stage
# -----------------------------------------------------------------------------
# Bringing the source over (rather than re-COPYing from the build
# context) keeps a single source-of-truth: the builder validated that
# `pip install -e .` succeeded against this exact tree. Re-copying from
# the build context could in principle drift if `.dockerignore` rules
# changed between stages.
COPY --from=builder --chown=appuser:appgroup ${APP_HOME}/pyproject.toml ./
COPY --from=builder --chown=appuser:appgroup ${APP_HOME}/README.md ./
COPY --from=builder --chown=appuser:appgroup ${APP_HOME}/alembic.ini ./
COPY --from=builder --chown=appuser:appgroup ${APP_HOME}/src ./src
COPY --from=builder --chown=appuser:appgroup ${APP_HOME}/scripts ./scripts

# -----------------------------------------------------------------------------
# Drop privileges
# -----------------------------------------------------------------------------
# Every instruction below this line runs as `appuser`, NOT root. The
# `USER` directive also affects `docker run --user`'s default; explicit
# `--user 1000:1000` at runtime is recommended for defence in depth.
USER appuser:appgroup

# -----------------------------------------------------------------------------
# Healthcheck
# -----------------------------------------------------------------------------
# Lightweight import-only healthcheck: succeeds whenever the package is
# importable in the configured Python environment. This catches venv
# corruption, missing shared libraries, and PYTHONPATH misconfiguration
# without requiring the application to expose an HTTP endpoint.
#
# Tuning rationale:
#   * `--interval=30s`     — every 30 s is a reasonable cadence; tighter
#                            wastes CPU, looser delays failure detection.
#   * `--timeout=10s`      — a `python -c "import ajit_backprop"` call
#                            should complete in milliseconds; 10 s is
#                            generous headroom for container startup.
#   * `--start-period=20s` — Python interpreter + lazy imports take a
#                            few seconds on first start; do not count
#                            failures during the start period.
#   * `--retries=3`        — three consecutive failures before marking
#                            unhealthy (avoids flapping on transient
#                            blips).
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD ["python", "-c", "import ajit_backprop; import sys; sys.exit(0)"]

# -----------------------------------------------------------------------------
# Entrypoint and default command
# -----------------------------------------------------------------------------
# `tini` as PID 1 ensures correct signal forwarding and zombie reaping
# (Python is not a great PID 1; a 10-second SIGTERM-to-SIGKILL escalation
# is a common production gotcha without an init shim).
#
# `CMD ["python", "-m", "ajit_backprop"]` is the AAP §0.5.1 mandated
# default — it invokes `src/ajit_backprop/__main__.py`. Override at
# runtime by appending arguments:
#     docker run --rm ajit-backprop-test python -m ajit_backprop --help
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python", "-m", "ajit_backprop"]


# =============================================================================
# CRITICAL — Secret-handling reminder
# -----------------------------------------------------------------------------
# This Dockerfile NEVER copies `.env` into any image layer. Secrets such
# as `DB_HOST` and `API_KEY` (AAP §0.8.3, §0.9.8) are passed at runtime
# via one of:
#
#   1. `--env-file .env`          (file must NOT be committed to VCS;
#                                  see `.gitignore`)
#   2. `--env DB_HOST=... --env API_KEY=...`
#   3. Docker secrets             (`--secret` with BuildKit, or
#                                  Compose / Swarm secret stores)
#   4. Orchestrator secret stores (Kubernetes `Secret`, AWS Secrets
#                                  Manager, HashiCorp Vault, etc.)
#
# `docker history --no-trunc <image>` MUST show NO secret values in any
# layer. `dive <image>` is a useful tool for verifying this manually.
#
# `.env.example` is intentionally NOT copied either: developers see it
# in the source tree, and there is no need for the running container to
# carry a template that documents variables it already receives via the
# environment.
# =============================================================================
