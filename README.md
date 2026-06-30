# Ajit-backprop-test

**Society Management** — a Python re-implementation of the original JavaScript
modules. The codebase has been migrated from JavaScript to Python to improve
code quality and structural performance while **preserving the existing public
API and behavior** (no functional regressions). See
[**Project status**](#project-status) for an overview of what the migration
delivers.

---

## Project status

The migration from JavaScript to Python is **complete**. The repository
delivers:

- the single canonical implementation, `society_compute(x)`, in
  `src/society_mgmt/core.py`;
- the `src`-layout package — the `society_mgmt` package, its nine layer
  sub-packages, and the `tests` package tree;
- the **name-preserving `mod_N_K` binding modules**
  (`src/society_mgmt/<layer>/file_*.py`) — all **28,305** bindings across the
  24 production modules in the nine layers, each delegating to
  `society_compute` (see **Overview — what changed** for how these numbers are
  derived);
- project packaging and tooling configuration: `pyproject.toml`,
  `requirements.txt`, `.gitignore`, and `LICENSE`; and
- the genuine `pytest` equivalence test suite. The four JavaScript
  *test-source* modules are implemented as real pytest tests —
  `tests/unit/file_9.js` → `tests/unit/test_file_9.py`,
  `tests/unit/file_20.js` → `tests/unit/test_file_20.py`,
  `tests/integration/file_10.js` → `tests/integration/test_file_10.py`, and
  `tests/integration/file_21.js` → `tests/integration/test_file_21.py`. The
  suite contains **276 tests, all passing**. These four modules are migrated
  **only** as genuine pytest tests — they are *not* re-exposed as `mod_N_K`
  binding modules (see **Overview — what changed**).

---

## Overview — what changed

The original project was a synthetic JavaScript codebase containing **33,105
byte-identical pure functions** named `mod_N_K(x)`, spread across 28 module
files. Every one of them implemented the exact same arithmetic body:

```javascript
function mod_N_K(x) { let r = 0; r += x*1; r += x*2; r += x*3; if (r % 2 === 0) { r += 10 } return r; }
```

The refactor migrates this codebase to an idiomatic Python `src`-layout package
in the **same repository**, applying the following changes:

- **De-duplication (DRY).** All 33,105 identical bodies are consolidated into a
  single canonical function, `society_compute(x)`, in
  `src/society_mgmt/core.py`. This removes roughly **300,000 lines** of
  duplicated and dead code.
- **API preservation.** Every original `mod_N_K` name from the **24 production
  modules** (the nine layers) is retained as a thin, name-preserving binding
  that delegates to `society_compute`, so every public function remains
  importable and returns identical values. This is **28,305** bindings in total
  — see **How the counts break down** below. (The four JavaScript *test-source*
  modules are migrated as genuine pytest tests, not as binding modules; see the
  next bullet.)
- **Dead-code elimination.** The comment-only padding file (`filler.js`) and the
  unused `const store = []` declaration in every module are dropped — they are
  not carried into the Python package.
- **Real tests.** The four JavaScript *test-source* modules (`file_9`,
  `file_20` in `tests/unit/`; `file_10`, `file_21` in `tests/integration/`)
  contained no assertions; they are replaced with genuine `pytest` equivalence
  tests that prove behavioral parity. That suite now exists and its **276 tests
  all pass**. Per the target structure, these four modules are migrated **only**
  as genuine pytest tests under `tests/` — they are *not* re-exposed as
  `mod_N_K` binding modules, so they do not add to the importable public
  surface.

> **A note on "performance."** The functions are pure, constant-time (`O(1)`)
> arithmetic — there are no loops or I/O to optimize. The performance
> improvement is therefore **structural**: eliminating ~300,000 lines of
> duplicated and dead code and shipping a single, minimal, idiomatic
> implementation. The per-call result is already computed in closed form, so no
> algorithmic speedup is claimed or needed.

### How the counts break down

The original archive contained **33,105** `mod_N_K` functions across **all 28**
JavaScript module files. Those 28 files split into two groups, which are
migrated differently:

| Group | Source files | Functions | Becomes |
|-------|--------------|-----------|---------|
| Production modules (nine layers) | 24 files | **28,305** | Name-preserving binding modules under `src/society_mgmt/<layer>/` |
| Test-source modules | 4 files — `file_9`, `file_20` (unit); `file_10`, `file_21` (integration) | 4,800 | Genuine `pytest` equivalence tests under `tests/` (**not** re-exposed as binding modules) |

So the importable, name-preserving public surface is **28,305** bindings — every
`mod_N_K` name from the 24 production modules across the nine layers. The 4,800
functions from the four test-source modules are migrated as real `pytest`
assertions (so behavior is proven), not as callable bindings, and therefore do
not add to the public surface. (`filler.js` contributes no functions and is
dropped.) The per-layer binding counts are: `controllers`, `services`,
`models`, `routes`, and `utils` = 3,600 each; `middleware` = 3,105 (`file_27`
has 705); and `config`, `repositories`, and `domain` = 2,400 each.

### The function contract

For an input `x`, the result is:

```
r = x*1 + x*2 + x*3            # i.e. r = 6 * x
result = r + 10  if  r is even
result = r       otherwise
```

For **integer** `x`, `6 * x` is always even, so the result is `6*x + 10`. For
**non-integer** `x`, the even/odd test genuinely governs whether `+10` is
applied. The Python port keeps this test rather than hardcoding `+10`, so the
contract is preserved across the full numeric domain.

---

## Project structure

This is a `src`-layout package. The nine production layer directory names
(`controllers`, `services`, `models`, `routes`, `utils`, `middleware`,
`config`, `repositories`, `domain`) are retained **only as package labels** for
structural fidelity with the original source. They carry **no** MVC,
data-access, routing, or configuration behavior, because none existed in the
source to preserve.

**Layout.** The canonical implementation lives in `core.py`, every layer
sub-package contains its name-preserving `mod_N_K` binding modules, and the
top-level `tests/` tree holds the genuine `pytest` equivalence suite alongside
its package markers:

```
.
├── pyproject.toml              # build system, metadata, ruff & pytest config
├── requirements.txt            # dev/test tooling (no runtime dependencies)
├── README.md
├── LICENSE                     # MIT
├── .gitignore
├── src/
│   └── society_mgmt/
│       ├── __init__.py         # re-exports society_compute
│       ├── core.py             # society_compute(x) — the single canonical implementation
│       ├── controllers/        # __init__.py + file_0.py, file_11.py, file_22.py
│       ├── services/           # __init__.py + file_1.py, file_12.py, file_23.py
│       ├── models/             # __init__.py + file_2.py, file_13.py, file_24.py
│       ├── routes/             # __init__.py + file_3.py, file_14.py, file_25.py
│       ├── utils/              # __init__.py + file_4.py, file_15.py, file_26.py
│       ├── middleware/         # __init__.py + file_5.py, file_16.py, file_27.py
│       ├── config/             # __init__.py + file_6.py, file_17.py
│       ├── repositories/       # __init__.py + file_7.py, file_18.py
│       └── domain/             # __init__.py + file_8.py, file_19.py
└── tests/
    ├── __init__.py
    ├── unit/                   # __init__.py + test_file_9.py, test_file_20.py
    └── integration/            # __init__.py + test_file_10.py, test_file_21.py
```

Each per-layer module imports the canonical implementation and re-exposes its
original function names as thin, name-preserving bindings — for example:

```python
from society_mgmt.core import society_compute


def mod_0_0(x):
    return society_compute(x)
```

---

## Requirements

- **Python `>=3.14`** (matches `requires-python` in `pyproject.toml`).
- **No third-party runtime dependencies** — the `society_mgmt` package uses only
  the Python standard library.
- Development / test tooling (installed separately, see below):
  - `pytest==9.0.3` — test runner for the equivalence tests.
  - `ruff==0.15.16` — linter and formatter (PEP 8 enforcement).

---

## Setup / installation

Create and activate a virtual environment, then install the package in editable
mode along with the development tools.

**1. Create a virtual environment:**

```bash
python -m venv .venv
```

**2. Activate it:**

```bash
# POSIX (Linux/macOS)
source .venv/bin/activate

# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# Windows (cmd.exe)
.venv\Scripts\activate
```

**3. Install the package (editable) and the dev/test tooling:**

```bash
pip install -e .
pip install -r requirements.txt
```

The dev tools can alternatively be installed via the optional extra declared in
`pyproject.toml`:

```bash
pip install -e ".[dev]"
```

> This is a pure-Python library: the commands above are all that is required —
> there is no separate build step to run. If a configuration surface is ever
> added, any secrets must be read from environment variables and never
> hardcoded; no configuration is required by this library today.

---

## Usage

Call the canonical implementation directly. It is available both from
`society_mgmt.core` and as a top-level re-export of the `society_mgmt`
package — both return identical values:

```python
from society_mgmt.core import society_compute

society_compute(0)   # -> 10
society_compute(1)   # -> 16
society_compute(2)   # -> 22

# society_compute is also re-exported at the top level of the package:
from society_mgmt import society_compute

society_compute(2)   # -> 22
```

Every original `mod_N_K` name is importable now and returns the same value as
`society_compute` — for example:

```python
from society_mgmt.controllers import file_0

file_0.mod_0_0(2)    # -> 22  (name-preserving binding delegates to society_compute)
```

---

## Running tests

The test harness is configured via `pyproject.toml`
(`testpaths = ["tests"]`, `pythonpath = ["src"]`), so no per-run setup is
required.

The genuine `pytest` equivalence suite — unit tests in `tests/unit/`
(`test_file_9.py`, `test_file_20.py`) and cross-module parity tests in
`tests/integration/` (`test_file_10.py`, `test_file_21.py`) — proves behavioral
parity with the original JavaScript contract. Run the full suite (**276 tests**)
from the repository root with:

```bash
pytest
```

Linting and formatting with `ruff` work today and can be run from the
repository root:

```bash
ruff check .
ruff format .
```

---

## License

Released under the **MIT License**. See the [`LICENSE`](LICENSE) file for the
full text.
