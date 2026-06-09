# Ajit-backprop-test

**Society Management** — a Python re-implementation of the original JavaScript
modules. The codebase was refactored from JavaScript to Python to improve code
quality and structural performance while **preserving the existing public API
and behavior** (no functional regressions).

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
- **API preservation.** Every original `mod_N_K` name is retained as a thin,
  name-preserving binding that delegates to `society_compute`, so every public
  function remains importable and returns identical values.
- **Dead-code elimination.** The comment-only padding file (`filler.js`) and the
  unused `const store = []` declaration in every module are dropped.
- **Real tests.** The source "test" files contained no assertions; they are
  replaced with genuine `pytest` equivalence tests that prove behavioral parity.

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

```
.
├── pyproject.toml              # build system, metadata, ruff & pytest config
├── requirements.txt            # dev/test tooling (no runtime dependencies)
├── README.md
├── LICENSE                     # MIT
├── .gitignore
├── src/
│   └── society_mgmt/
│       ├── __init__.py
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
original function names as thin bindings, for example:

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

Call the canonical implementation directly, or use any of the original
name-preserving bindings — both return identical values.

```python
from society_mgmt.core import society_compute

society_compute(0)   # -> 10
society_compute(1)   # -> 16
society_compute(2)   # -> 22

# Every original mod_N_K name is still importable and returns the same value:
from society_mgmt.controllers import file_0

file_0.mod_0_0(2)    # -> 22  (name-preserving binding delegates to society_compute)
```

---

## Running tests

The test suite is configured via `pyproject.toml` (`testpaths = ["tests"]`,
`pythonpath = ["src"]`). Unit tests live in `tests/unit/` and cross-module
parity tests in `tests/integration/`. From the repository root, run:

```bash
pytest
```

To lint and format the codebase with `ruff`:

```bash
ruff check .
ruff format .
```

---

## License

Released under the **MIT License**. See the [`LICENSE`](LICENSE) file for the
full text.
