# Ajit-backprop-test

**Society Management** — a Python re-implementation of the original JavaScript
modules. The codebase is being migrated from JavaScript to Python to improve
code quality and structural performance while **preserving the existing public
API and behavior** (no functional regressions). See
[**Project status**](#project-status) for what exists today versus what is
planned.

---

## Project status

This repository is being migrated from JavaScript to Python in stages. **The
current foundation is in place:**

- the single canonical implementation, `society_compute(x)`, in
  `src/society_mgmt/core.py`;
- the `src`-layout package skeleton — the `society_mgmt` package, its nine layer
  sub-packages, and the `tests` package tree (each currently containing only its
  `__init__.py` marker); and
- project packaging and tooling configuration: `pyproject.toml`,
  `requirements.txt`, `.gitignore`, and `LICENSE`.

**Planned for subsequent checkpoints:** the name-preserving `mod_N_K` binding
modules (`src/society_mgmt/<layer>/file_*.py`) and the genuine `pytest`
equivalence test suite (`tests/unit/test_file_*.py`,
`tests/integration/test_file_*.py`). Sections below mark anything that depends
on those not-yet-created files as **(planned)**.

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
- **API preservation _(planned)_.** Every original `mod_N_K` name will be
  retained as a thin, name-preserving binding that delegates to
  `society_compute`, so every public function remains importable and returns
  identical values. These binding modules are added in a subsequent checkpoint
  (see [Project status](#project-status)).
- **Dead-code elimination.** The comment-only padding file (`filler.js`) and the
  unused `const store = []` declaration in every module are dropped — they are
  not carried into the Python package.
- **Real tests _(planned)_.** The source "test" files contained no assertions;
  they are replaced with genuine `pytest` equivalence tests that prove
  behavioral parity. The test suite is added in a subsequent checkpoint.

> **A note on "performance."** The functions are pure, constant-time (`O(1)`)
> arithmetic — there are no loops, I/O, database, or network operations to
> optimize. The performance improvement is therefore **structural**: eliminating
> ~300,000 lines of duplicated and dead code and shipping a single, minimal,
> idiomatic implementation. The per-call result is already computed in closed
> form, so no algorithmic speedup is claimed or needed.

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

This is a `src`-layout package. The nine layer directory names
(`controllers`, `services`, `models`, `routes`, `utils`, `middleware`,
`config`, `repositories`, `domain`) are retained **only as package labels** for
structural fidelity with the original source — they carry **no** MVC,
data-access, routing, or configuration behavior, because none existed in the
source to preserve.

**Current layout (this checkpoint).** Each layer sub-package currently contains
only its `__init__.py` marker; the canonical implementation lives in `core.py`:

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
│       ├── controllers/        # __init__.py
│       ├── services/           # __init__.py
│       ├── models/             # __init__.py
│       ├── routes/             # __init__.py
│       ├── utils/              # __init__.py
│       ├── middleware/         # __init__.py
│       ├── config/             # __init__.py
│       ├── repositories/       # __init__.py
│       └── domain/             # __init__.py
└── tests/
    ├── __init__.py
    ├── unit/                   # __init__.py
    └── integration/            # __init__.py
```

**Planned final layout _(subsequent checkpoints)_.** The name-preserving
`mod_N_K` binding modules and the genuine `pytest` equivalence tests are added
to the same skeleton later. When complete, the per-layer binding modules and
test files appear as:

```
src/
└── society_mgmt/
    ├── controllers/        # + file_0.py, file_11.py, file_22.py
    ├── services/           # + file_1.py, file_12.py, file_23.py
    ├── models/             # + file_2.py, file_13.py, file_24.py
    ├── routes/             # + file_3.py, file_14.py, file_25.py
    ├── utils/              # + file_4.py, file_15.py, file_26.py
    ├── middleware/         # + file_5.py, file_16.py, file_27.py
    ├── config/             # + file_6.py, file_17.py
    ├── repositories/       # + file_7.py, file_18.py
    └── domain/             # + file_8.py, file_19.py
tests/
├── unit/                   # + test_file_9.py, test_file_20.py
└── integration/            # + test_file_10.py, test_file_21.py
```

Once added, each per-layer module will import the canonical implementation and
re-expose its original function names as thin bindings — for example:

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

> This project does **not** use Node.js, npm, a database, database migrations,
> native shared libraries, or any external API. If a configuration surface is
> ever added, any secrets must be read from environment variables and never
> hardcoded — but no configuration is required by this library today.

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

**(Planned)** Once the binding modules are added (see
[Project status](#project-status)), every original `mod_N_K` name will be
importable and will return the same value — for example:

```python
# Available after the binding modules are added in a subsequent checkpoint:
from society_mgmt.controllers import file_0

file_0.mod_0_0(2)    # -> 22  (name-preserving binding delegates to society_compute)
```

---

## Running tests

The test harness is already configured via `pyproject.toml`
(`testpaths = ["tests"]`, `pythonpath = ["src"]`), so no per-run setup is
required.

**(Planned)** The genuine `pytest` equivalence suite — unit tests in
`tests/unit/` and cross-module parity tests in `tests/integration/` — is added
in a subsequent checkpoint (see [Project status](#project-status)). Once those
test files exist, run the full suite from the repository root with:

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
