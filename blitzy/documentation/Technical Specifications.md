# Technical Specification

# 0. Agent Action Plan

## 0.1 Intent Clarification

This sub-section restates the user's request in precise technical language and surfaces the implicit requirements that the Blitzy platform must satisfy in order to deliver a complete, behavior-preserving, performance-improved Python port of the existing JavaScript codebase contained in `society_mgmt_300k.zip` at the repository root.

### 0.1.1 Core Refactoring Objective

Based on the prompt, the Blitzy platform understands that the refactoring objective is to perform a complete cross-language port of the `Ajit-backprop-test` repository's bundled `society_mgmt_300k.zip` payload from JavaScript to Python while preserving 100% of the externally observable computational behavior of every existing function and concurrently eliminating the redundant arithmetic and dead-code patterns that constitute the documented performance issue.

- **Refactoring type**: Tech stack migration (JavaScript → Python) combined with Performance optimization (redundant computation elimination, dead-code removal, function deduplication via shared helpers) and Modularity (introduction of a proper Python package structure with `__init__.py` exports, replacing JavaScript's flat-file model).

- **Target repository**: Same repository — the Python port replaces the contents of `society_mgmt_300k.zip` in-place by adding source-controlled Python files at the repository root. The original `society_mgmt_300k.zip` archive is retained at the repository root as a historical reference artifact and is NOT modified, extracted into the working tree, or committed in unzipped form.

- **Refactoring goals (with enhanced clarity)**:
    - Translate every JavaScript module under the unzipped `src/**` and `tests/**` trees into an idiomatic Python module of the same logical role, preserving the existing layered architecture (config, controllers, domain, middleware, models, repositories, routes, services, utils).
    - Preserve byte-exact return values for every public function: for any input `x`, every `mod_N_M(x)` JavaScript function and its Python counterpart MUST return the identical numeric value. The current behavior is `r = x*1 + x*2 + x*3` followed by `if r % 2 === 0 then r += 10`; this evaluates to `6*x + 10` for every integer or numeric input because `6*x` is always even.
    - Improve runtime performance by replacing the redundant 4-statement arithmetic block with a single direct expression (`return 6 * x + 10`), eliminating the always-true conditional branch (`if (r % 2 === 0)` is unreachable as false because `6x` is even for all integer x), and removing the unused module-level `const store = []` declaration that allocates a JavaScript array but is never read or written.
    - Improve code quality by collapsing the ~33,105 byte-identical function bodies (27 files × 1,200 functions + 1 file × 705 functions) into a single shared implementation referenced by name aliases per module, reducing the source-of-truth duplication ratio from 33,105:1 to 1:33,105.
    - Provide a Python `pyproject.toml` manifest, a `pytest` configuration, and a runnable test suite mirroring the existing `tests/unit/**` and `tests/integration/**` JavaScript test files so that the port is independently buildable, installable, and verifiable without external scaffolding.

- **Implicit requirements surfaced**:
    - **API compatibility within Python**: Every public function name (`mod_0_0` through `mod_27_704`) must remain importable from the same logical module path in Python (e.g., `society_mgmt.controllers.file_0.mod_0_0`) so that any external consumer porting their call sites can perform a one-to-one symbol lookup.
    - **Numeric type fidelity**: JavaScript's number type is IEEE 754 double; Python's `int` and `float` differ. The port must produce results equal under Python's numeric model for the integer inputs typically exercised by the tests, and must not silently introduce floating-point coercion where the source returned an integer.
    - **Architectural preservation**: The folder taxonomy (`config`, `controllers`, `domain`, `middleware`, `models`, `repositories`, `routes`, `services`, `utils`) MUST be carried over verbatim so that the conceptual layering signaled by the JavaScript organization remains explicit in Python.
    - **Filler-file equivalence**: The non-functional `src/utils/filler.js` (1,999 lines of `// filler N` comments and zero functions) must be ported to a Python equivalent that preserves the file's intent as a non-executable line-count placeholder; it MUST NOT be silently dropped because doing so would change the project's source surface area.
    - **License preservation**: The existing `LICENSE/LICENSE.txt` (MIT License, Copyright 2026) MUST be carried over unchanged into the Python tree to preserve attribution.
    - **Repository-root co-existence**: The pre-existing `README.md` ("Ajit-backprop-test … test project for backprop integration.") and the original `society_mgmt_300k.zip` archive at the repository root are NOT to be deleted; the Python source tree is added alongside them.

### 0.1.2 Technical Interpretation

This refactoring translates to the following technical transformation strategy: a one-to-one structural port of every JavaScript file under the `society_mgmt_300k.zip` payload to a Python module of equivalent role, with the function bodies algebraically simplified to their closed-form equivalent and all duplicated function bodies consolidated through a shared private helper that is invoked under each public symbol's name.

- **Current architecture → Target architecture mapping**:

| Current (JavaScript) | Target (Python) | Transformation Rule |
|----------------------|-----------------|---------------------|
| `src/<layer>/file_N.js` (CommonJS-flavored top-level functions, no `require`/`module.exports`) | `src/society_mgmt/<layer>/file_N.py` (module with explicit `__all__` and idiomatic `def` statements) | Convert flat function file into Python module; collect all public function names into `__all__`; expose via `from .file_N import *` aggregation in the layer's `__init__.py` |
| `// mod_N - society module` header comment | Module-level docstring `"""mod_N - society module."""` | Convert single-line JavaScript comment to PEP 257 module docstring |
| `const store = [];` (dead code) | Removed entirely | Dead-code elimination — symbol is never read or written anywhere in the codebase |
| `function mod_N_M(x){ let r=0; r+=x*1; r+=x*2; r+=x*3; if(r%2===0){r+=10}; return r; }` | A single private `_mod_compute(x)` returning `6 * x + 10`, with each public name `mod_N_M = _mod_compute` aliased to it | Algebraic simplification + function-body deduplication; observable behavior preserved exactly because `6x` is even for all integer x, making the original conditional always-true |
| `tests/unit/file_N.js` (10,802-line near-duplicate) | `tests/unit/test_file_N.py` (executable pytest module that asserts the closed-form equivalence for a representative input range) | Convert to pytest test module that imports from `society_mgmt.<layer>.file_N` and verifies `mod_N_M(x) == 6*x + 10` for a sampled input range |
| `tests/integration/file_N.js` (10,802-line near-duplicate) | `tests/integration/test_file_N.py` (executable pytest module that asserts cross-module composition equivalence) | Convert to pytest integration test that exercises the layer-to-layer interaction surface |
| `src/utils/filler.js` (1,999 comment lines, zero functions) | `src/society_mgmt/utils/filler.py` (Python module with equivalent comment lines and no executable code) | Verbatim line-for-line comment port to preserve the file's documented role |
| No JavaScript dependency manifest (no `package.json`) | New `pyproject.toml` + `requirements-dev.txt` at repository root | Create greenfield Python project metadata: package name `society-mgmt`, Python `>=3.12`, dev dependency `pytest>=9.0.3` |

- **Transformation rules and patterns applied uniformly**:
    - **Naming**: Python module filenames mirror the JavaScript filenames (e.g., `file_0.js` → `file_0.py`); function names are preserved exactly (`mod_0_0` → `mod_0_0`); folder names are preserved exactly (`controllers` → `controllers`).
    - **Closed-form simplification**: The original four-line arithmetic block evaluates to `6*x + 10` for every numeric input because the conditional `r % 2 === 0` is true for `r = 6*x` for all integer `x`. The Python implementation reduces this to a single arithmetic expression executed in one CPython bytecode pathway instead of the original five operations followed by a comparison and conditional addition.
    - **Function-body deduplication**: Because every `mod_N_M` body is byte-identical, each Python module defines a single private `_mod_compute(x)` (or imports a shared `society_mgmt._core.mod_compute`) and assigns each public name to it. This collapses 33,105 duplicated function bodies into 1 implementation while preserving every public symbol.
    - **Module assembly**: Each Python module concludes with an `__all__` list enumerating every public `mod_N_M` symbol exported from that file, ensuring `from file_N import *` semantics match the JavaScript file's implicit export of all top-level functions.
    - **Dead-code elimination**: The `const store = [];` declaration present at the top of every JavaScript module is dropped from the Python translation because no read, write, push, pop, indexing, or other reference to `store` exists anywhere in the source tree.
    - **Test conversion strategy**: Rather than transliterate the 10,802-line repetitive test files into 10,802-line pytest files, each test module collapses the redundant assertions into a parametric pytest test (`@pytest.mark.parametrize`) that covers the same input/output equivalence space in a fraction of the lines while providing strictly stronger coverage.
    - **Package layout**: The Python project adopts the `src/` layout (sources under `src/society_mgmt/...`) which is the prevailing modern convention and prevents the common pitfall of accidentally importing from the working directory rather than from the installed package.


## 0.2 Source Analysis

This sub-section enumerates every source file in scope for the refactor with concrete file paths, line counts, and content fingerprints. The complete file inventory was obtained by extracting `society_mgmt_300k.zip` (the only non-README artifact present at the repository root) into a working directory and exhaustively listing its contents.

### 0.2.1 Comprehensive Source File Discovery

The repository's working tree at the time of analysis contains exactly two top-level artifacts: `README.md` (a 2-line orientation file naming the project "Ajit-backprop-test") and `society_mgmt_300k.zip` (a 105,459-byte archive holding the JavaScript codebase to be refactored). All source files for this refactor live inside that archive. There are no `.blitzyignore` files anywhere in the repository tree, so no path-pattern exclusions apply.

When extracted, the archive yields a fully populated layered-architecture project consisting of 30 files (1 LICENSE text file + 29 JavaScript files) totaling 300,000 lines of JavaScript across 11 directories. The complete inventory follows.

**Production source files (24 files, all `*.js`):**

| Source File | Lines | Function Count | Structural Pattern |
|-------------|------:|---------------:|--------------------|
| `src/config/file_6.js` | 10,802 | 1,200 | `mod_6_0` … `mod_6_1199` |
| `src/config/file_17.js` | 10,802 | 1,200 | `mod_17_0` … `mod_17_1199` |
| `src/controllers/file_0.js` | 10,802 | 1,200 | `mod_0_0` … `mod_0_1199` |
| `src/controllers/file_11.js` | 10,802 | 1,200 | `mod_11_0` … `mod_11_1199` |
| `src/controllers/file_22.js` | 10,802 | 1,200 | `mod_22_0` … `mod_22_1199` |
| `src/domain/file_8.js` | 10,802 | 1,200 | `mod_8_0` … `mod_8_1199` |
| `src/domain/file_19.js` | 10,802 | 1,200 | `mod_19_0` … `mod_19_1199` |
| `src/middleware/file_5.js` | 10,802 | 1,200 | `mod_5_0` … `mod_5_1199` |
| `src/middleware/file_16.js` | 10,802 | 1,200 | `mod_16_0` … `mod_16_1199` |
| `src/middleware/file_27.js` | 6,347 | 705 | `mod_27_0` … `mod_27_704` (smaller variant) |
| `src/models/file_2.js` | 10,802 | 1,200 | `mod_2_0` … `mod_2_1199` |
| `src/models/file_13.js` | 10,802 | 1,200 | `mod_13_0` … `mod_13_1199` |
| `src/models/file_24.js` | 10,802 | 1,200 | `mod_24_0` … `mod_24_1199` |
| `src/repositories/file_7.js` | 10,802 | 1,200 | `mod_7_0` … `mod_7_1199` |
| `src/repositories/file_18.js` | 10,802 | 1,200 | `mod_18_0` … `mod_18_1199` |
| `src/routes/file_3.js` | 10,802 | 1,200 | `mod_3_0` … `mod_3_1199` |
| `src/routes/file_14.js` | 10,802 | 1,200 | `mod_14_0` … `mod_14_1199` |
| `src/routes/file_25.js` | 10,802 | 1,200 | `mod_25_0` … `mod_25_1199` |
| `src/services/file_1.js` | 10,802 | 1,200 | `mod_1_0` … `mod_1_1199` |
| `src/services/file_12.js` | 10,802 | 1,200 | `mod_12_0` … `mod_12_1199` |
| `src/services/file_23.js` | 10,802 | 1,200 | `mod_23_0` … `mod_23_1199` |
| `src/utils/file_4.js` | 10,802 | 1,200 | `mod_4_0` … `mod_4_1199` |
| `src/utils/file_15.js` | 10,802 | 1,200 | `mod_15_0` … `mod_15_1199` |
| `src/utils/file_26.js` | 10,802 | 1,200 | `mod_26_0` … `mod_26_1199` |
| `src/utils/filler.js` | 1,999 | 0 | Comment-only file (`// filler 298001` … `// filler 300000`) |

**Test source files (4 files, all `*.js`):**

| Source File | Lines | Function Count | Structural Pattern |
|-------------|------:|---------------:|--------------------|
| `tests/integration/file_10.js` | 10,802 | 1,200 | `mod_10_0` … `mod_10_1199` |
| `tests/integration/file_21.js` | 10,802 | 1,200 | `mod_21_0` … `mod_21_1199` |
| `tests/unit/file_9.js` | 10,802 | 1,200 | `mod_9_0` … `mod_9_1199` |
| `tests/unit/file_20.js` | 10,802 | 1,200 | `mod_20_0` … `mod_20_1199` |

**License file (1 file):**

| Source File | Lines | Content |
|-------------|------:|---------|
| `LICENSE/LICENSE.txt` | (full MIT text) | MIT License, Copyright (c) 2026 |

**Repository-root files (2 files, NOT extracted from the archive — already present in the working tree):**

| Source File | Lines | Role in Refactor |
|-------------|------:|------------------|
| `README.md` | 2 | UPDATE — extend with Python build/test/run instructions |
| `society_mgmt_300k.zip` | (binary) | UNCHANGED — retained as historical reference; not modified, not re-zipped |

**Aggregate metrics**:

- Total JavaScript files in scope: **29** (28 functional + 1 comment-only filler)
- Total JavaScript lines in scope: **300,000**
- Total `mod_N_M` function definitions in scope: **33,105** (27 × 1,200 + 1 × 705)
- Distinct function-body fingerprints across all 33,105 definitions: **1** (every body is byte-identical to every other body)
- Distinct module-level statements above the function definitions: **2 invariants** — a module-name banner comment (`// mod_N - society module`) and a `const store = [];` declaration that is never referenced elsewhere

**Module-system inventory**: Repository-wide `grep` for `require(`, `module.exports`, `import `, `export ` across every JavaScript source and test file returns zero matches. The codebase therefore has no inter-file dependencies, no external library imports, and no module-system surface area that the Python port must replicate. Each `*.js` file is fully self-contained.

**External-side-effect inventory**: Repository-wide `grep` for `async`, `await`, `Promise`, `setTimeout`, `setInterval`, `process.`, `console.`, `Date.`, `Math.`, `fetch`, `fs.`, `http.`, callback-style I/O, or any other external API returns zero matches. Every function is a pure synchronous integer-in/integer-out arithmetic computation with no I/O, no time dependence, and no global mutation.

### 0.2.2 Current Structure Mapping

The complete current source tree, derived from the extracted archive, is:

```
Current (extracted from society_mgmt_300k.zip at repo root):
.
├── README.md                       (2 lines, repo-root, pre-existing)
├── society_mgmt_300k.zip           (105 KB, repo-root, contains the tree below)
└── (extracted)/
    ├── LICENSE/
    │   └── LICENSE.txt             (MIT License, Copyright 2026)
    ├── src/
    │   ├── config/
    │   │   ├── file_6.js           (1,200 functions, 10,802 lines)
    │   │   └── file_17.js          (1,200 functions, 10,802 lines)
    │   ├── controllers/
    │   │   ├── file_0.js           (1,200 functions, 10,802 lines)
    │   │   ├── file_11.js          (1,200 functions, 10,802 lines)
    │   │   └── file_22.js          (1,200 functions, 10,802 lines)
    │   ├── domain/
    │   │   ├── file_8.js           (1,200 functions, 10,802 lines)
    │   │   └── file_19.js          (1,200 functions, 10,802 lines)
    │   ├── middleware/
    │   │   ├── file_5.js           (1,200 functions, 10,802 lines)
    │   │   ├── file_16.js          (1,200 functions, 10,802 lines)
    │   │   └── file_27.js          (705 functions, 6,347 lines — smaller variant)
    │   ├── models/
    │   │   ├── file_2.js           (1,200 functions, 10,802 lines)
    │   │   ├── file_13.js          (1,200 functions, 10,802 lines)
    │   │   └── file_24.js          (1,200 functions, 10,802 lines)
    │   ├── repositories/
    │   │   ├── file_7.js           (1,200 functions, 10,802 lines)
    │   │   └── file_18.js          (1,200 functions, 10,802 lines)
    │   ├── routes/
    │   │   ├── file_3.js           (1,200 functions, 10,802 lines)
    │   │   ├── file_14.js          (1,200 functions, 10,802 lines)
    │   │   └── file_25.js          (1,200 functions, 10,802 lines)
    │   ├── services/
    │   │   ├── file_1.js           (1,200 functions, 10,802 lines)
    │   │   ├── file_12.js          (1,200 functions, 10,802 lines)
    │   │   └── file_23.js          (1,200 functions, 10,802 lines)
    │   └── utils/
    │       ├── file_4.js           (1,200 functions, 10,802 lines)
    │       ├── file_15.js          (1,200 functions, 10,802 lines)
    │       ├── file_26.js          (1,200 functions, 10,802 lines)
    │       └── filler.js           (0 functions, 1,999 comment-only lines)
    └── tests/
        ├── integration/
        │   ├── file_10.js          (1,200 functions, 10,802 lines)
        │   └── file_21.js          (1,200 functions, 10,802 lines)
        └── unit/
            ├── file_9.js           (1,200 functions, 10,802 lines)
            └── file_20.js          (1,200 functions, 10,802 lines)
```

**Performance and code-quality findings (the basis for the user-stated "performance is issues")**:

- **Redundant arithmetic**: Each function performs four mutations on a local `r` variable (`r=0; r+=x*1; r+=x*2; r+=x*3`) where the entire chain is algebraically equivalent to a single multiplication `6 * x`. This is 5 statements + 1 conditional + 1 conditional addition per call where 1 expression suffices.
- **Always-true conditional**: The branch `if (r % 2 === 0) { r += 10 }` is provably always taken because `r = 6*x` is even for every integer `x`. This is a constant `+ 10` masquerading as a runtime check.
- **Massive duplication**: All 33,105 function bodies are byte-for-byte identical. The 300,000-line codebase compresses to a single 1-line implementation plus 33,105 name bindings, a 33,105-to-1 deduplication ratio.
- **Dead module state**: Every functional file declares `const store = [];` at module scope. Repository-wide search confirms this symbol is never read, written, indexed, pushed-to, or otherwise touched. It allocates a JavaScript array on module load for no observable benefit.
- **No abstraction layer**: Despite a folder taxonomy that implies architectural layering (controllers → services → repositories → domain → models), no file imports, calls, or otherwise interacts with any function in any other file. The taxonomy is purely organizational.
- **No external dependencies**: No `package.json`, no `node_modules`, no `require()` calls, no `import` statements. The JavaScript codebase runs against the Node.js runtime alone with no third-party libraries.

These findings collectively define the optimization surface that the Python port will exploit while preserving every public symbol's externally observable behavior.


## 0.3 Scope Boundaries

This sub-section defines exhaustively what is in scope and out of scope for the JavaScript-to-Python refactor, with explicit file-path patterns. Every file in the repository tree is classified into exactly one of these two categories, leaving no ambiguity about which artifacts the implementation phase will touch.

### 0.3.1 Exhaustively In Scope

The following file patterns and individual files are IN SCOPE for refactoring. Every entry below is concretely backed by an artifact discovered during the source analysis in section 0.2.

**Source code transformations (translate every JavaScript file to a Python module):**

- `src/config/file_6.js` — translate to `src/society_mgmt/config/file_6.py`
- `src/config/file_17.js` — translate to `src/society_mgmt/config/file_17.py`
- `src/controllers/file_0.js` — translate to `src/society_mgmt/controllers/file_0.py`
- `src/controllers/file_11.js` — translate to `src/society_mgmt/controllers/file_11.py`
- `src/controllers/file_22.js` — translate to `src/society_mgmt/controllers/file_22.py`
- `src/domain/file_8.js` — translate to `src/society_mgmt/domain/file_8.py`
- `src/domain/file_19.js` — translate to `src/society_mgmt/domain/file_19.py`
- `src/middleware/file_5.js` — translate to `src/society_mgmt/middleware/file_5.py`
- `src/middleware/file_16.js` — translate to `src/society_mgmt/middleware/file_16.py`
- `src/middleware/file_27.js` — translate to `src/society_mgmt/middleware/file_27.py`
- `src/models/file_2.js` — translate to `src/society_mgmt/models/file_2.py`
- `src/models/file_13.js` — translate to `src/society_mgmt/models/file_13.py`
- `src/models/file_24.js` — translate to `src/society_mgmt/models/file_24.py`
- `src/repositories/file_7.js` — translate to `src/society_mgmt/repositories/file_7.py`
- `src/repositories/file_18.js` — translate to `src/society_mgmt/repositories/file_18.py`
- `src/routes/file_3.js` — translate to `src/society_mgmt/routes/file_3.py`
- `src/routes/file_14.js` — translate to `src/society_mgmt/routes/file_14.py`
- `src/routes/file_25.js` — translate to `src/society_mgmt/routes/file_25.py`
- `src/services/file_1.js` — translate to `src/society_mgmt/services/file_1.py`
- `src/services/file_12.js` — translate to `src/society_mgmt/services/file_12.py`
- `src/services/file_23.js` — translate to `src/society_mgmt/services/file_23.py`
- `src/utils/file_4.js` — translate to `src/society_mgmt/utils/file_4.py`
- `src/utils/file_15.js` — translate to `src/society_mgmt/utils/file_15.py`
- `src/utils/file_26.js` — translate to `src/society_mgmt/utils/file_26.py`
- `src/utils/filler.js` — translate to `src/society_mgmt/utils/filler.py` (preserve the filler-comment role)
- Wildcard generalization (for clarity, not to introduce additional in-scope files): `src/**/*.js` → `src/society_mgmt/**/*.py`

**Test transformations (translate every JavaScript test to a pytest module):**

- `tests/integration/file_10.js` — translate to `tests/integration/test_file_10.py`
- `tests/integration/file_21.js` — translate to `tests/integration/test_file_21.py`
- `tests/unit/file_9.js` — translate to `tests/unit/test_file_9.py`
- `tests/unit/file_20.js` — translate to `tests/unit/test_file_20.py`
- Wildcard generalization: `tests/**/*.js` → `tests/**/test_*.py`

**Python package scaffolding (CREATE new files required for a working Python project):**

- `src/society_mgmt/__init__.py` — package entry point with package-level `__all__` re-exports
- `src/society_mgmt/_core.py` — single shared implementation of the canonical `mod_compute(x) -> int` function used by every translated module
- `src/society_mgmt/config/__init__.py` — sub-package init aggregating `file_6` and `file_17`
- `src/society_mgmt/controllers/__init__.py` — sub-package init aggregating `file_0`, `file_11`, `file_22`
- `src/society_mgmt/domain/__init__.py` — sub-package init aggregating `file_8`, `file_19`
- `src/society_mgmt/middleware/__init__.py` — sub-package init aggregating `file_5`, `file_16`, `file_27`
- `src/society_mgmt/models/__init__.py` — sub-package init aggregating `file_2`, `file_13`, `file_24`
- `src/society_mgmt/repositories/__init__.py` — sub-package init aggregating `file_7`, `file_18`
- `src/society_mgmt/routes/__init__.py` — sub-package init aggregating `file_3`, `file_14`, `file_25`
- `src/society_mgmt/services/__init__.py` — sub-package init aggregating `file_1`, `file_12`, `file_23`
- `src/society_mgmt/utils/__init__.py` — sub-package init aggregating `file_4`, `file_15`, `file_26`, `filler`
- `tests/__init__.py` — empty marker so pytest can discover the tests sub-tree as a namespace
- `tests/unit/__init__.py` — empty marker
- `tests/integration/__init__.py` — empty marker
- `tests/conftest.py` — shared pytest fixtures (parameterized input ranges) used by both unit and integration test modules

**Configuration updates (CREATE new project metadata for the Python target):**

- `pyproject.toml` — Python project manifest: `[project]` table with `name = "society-mgmt"`, `requires-python = ">=3.12"`, `[build-system]` table using `setuptools`, `[tool.pytest.ini_options]` table configuring `testpaths`, and `[tool.setuptools.packages.find]` pointing at `src`
- `requirements-dev.txt` — pinned development dependencies, principally `pytest==9.0.3`
- `.gitignore` — Python-specific ignore patterns (`__pycache__/`, `*.pyc`, `.pytest_cache/`, `*.egg-info/`, `dist/`, `build/`, `.venv/`)

**Documentation updates:**

- `README.md` — UPDATE the existing 2-line README at the repository root by appending a new "Python Port" section that documents the `src/society_mgmt/...` package layout, the installation command (`pip install -e .[dev]`), the test command (`pytest`), and the migration note explaining that the Python tree replaces the JavaScript code previously archived in `society_mgmt_300k.zip`.

**License preservation:**

- `LICENSE/LICENSE.txt` — UPDATE: the existing MIT license text (currently bundled inside the zip archive) is hoisted to a repository-root `LICENSE` file, preserved verbatim including the "Copyright (c) 2026" line, so that the license is discoverable by tooling without requiring archive extraction.

**Import corrections:**

- Not applicable — the JavaScript source has zero `require()` calls, zero `module.exports`, zero `import` statements, and zero `export` statements (verified via repository-wide grep in section 0.2). There are therefore no existing import statements to update. The Python port's import surface is created fresh as part of the new `__init__.py` and `_core.py` scaffolding listed above.

### 0.3.2 Explicitly Out of Scope

The following items are explicitly NOT in scope for this refactor and MUST NOT be modified, deleted, regenerated, or otherwise touched by the implementation phase.

- **`society_mgmt_300k.zip` at the repository root** — This binary archive remains UNCHANGED. It is preserved as a historical reference of the pre-refactor JavaScript codebase. The Python port does not re-zip the new tree, replace the archive, or delete it.
- **Re-implementing functionality the source does not expose** — The folder taxonomy implies a web-application architecture (controllers, routes, middleware, services, repositories, models, domain), but no file in the source tree actually implements HTTP routing, middleware chains, repository persistence, or any web-framework integration. Adding any of these (e.g., introducing FastAPI, Flask, SQLAlchemy, an HTTP router, a database driver) is OUT OF SCOPE. The Python port preserves the source's actual behavior — pure synchronous arithmetic functions named `mod_N_M(x)` — and nothing beyond it.
- **Adding new functionality** — No new public functions, no new modules, no new architectural layers, no new endpoints, no new persistence, no new logging, no new telemetry, and no new configuration mechanisms beyond what is required to make the existing `mod_N_M(x)` symbols importable and callable in Python.
- **Changing public function signatures** — Every `mod_N_M` function MUST keep its arity (single positional parameter) and MUST keep its name exactly as in the source. Renaming, prefixing, suffixing, or otherwise altering public symbols is OUT OF SCOPE.
- **Translating to alternative target languages** — The user requested Python specifically. TypeScript, Rust, Go, Kotlin, or other targets are OUT OF SCOPE.
- **Concurrency, parallelism, or async transformation** — The source is synchronous and has no async surface. Introducing `asyncio`, threading, multiprocessing, or other parallel-execution machinery is OUT OF SCOPE because (a) the user did not request it, (b) the existing source does not expose it, and (c) the per-call arithmetic is too cheap to benefit from parallelism overhead.
- **CI/CD pipeline changes** — No `.github/workflows/`, no `.gitlab-ci.yml`, no Jenkinsfile, no Buildkite, and no pre-commit hooks. None exist in the current repository, and none are required for the Python port to be buildable and testable. Establishing CI is OUT OF SCOPE for this task.
- **Containerization** — No `Dockerfile`, no `docker-compose.yml`, no Kubernetes manifests. The Python port runs against a developer's local Python 3.12 interpreter and pytest installation; no container packaging is required.
- **Replacing the existing `README.md` introductory line** — The pre-existing `README.md` text "Ajit-backprop-test" / "test project for backprop integration." MUST be retained verbatim. Only an additional Python-port section is appended.
- **Pre-existing `.git/` history** — Git history, branches, tags, and configuration are OUT OF SCOPE; the implementation phase commits the new Python tree but does not rewrite history.
- **Touching `/app/`, `/tmp/extracted_zip/`, or any other infrastructure path** — These are working directories used during analysis only. The implementation phase writes only to paths inside the user's repository working tree.


## 0.4 Target Design

This sub-section defines the precise shape of the post-refactor Python codebase, including every file that must exist for the port to be a self-contained, installable, and pytest-runnable project. It also documents the research conducted and the design patterns that govern the translation rules.

### 0.4.1 Refactored Structure Planning

The Python port adopts a modern `src/`-layout package structure rooted at the repository, replicating the JavaScript folder taxonomy verbatim under a new `society_mgmt` package namespace. Every file listed below is explicit and required; nothing is left "to be discovered" during implementation.

```
Target (post-refactor repository state):
.
├── README.md                                  (UPDATED — adds Python Port section)
├── LICENSE                                    (NEW — hoisted from LICENSE/LICENSE.txt)
├── society_mgmt_300k.zip                      (UNCHANGED — historical reference)
├── pyproject.toml                             (NEW — project metadata + pytest config)
├── requirements-dev.txt                       (NEW — pinned dev dependencies)
├── .gitignore                                 (NEW — Python ignore patterns)
├── src/
│   └── society_mgmt/
│       ├── __init__.py                        (NEW — top-level package init)
│       ├── _core.py                           (NEW — single shared mod_compute helper)
│       ├── config/
│       │   ├── __init__.py                    (NEW — sub-package init)
│       │   ├── file_6.py                      (FROM src/config/file_6.js)
│       │   └── file_17.py                     (FROM src/config/file_17.js)
│       ├── controllers/
│       │   ├── __init__.py                    (NEW)
│       │   ├── file_0.py                      (FROM src/controllers/file_0.js)
│       │   ├── file_11.py                     (FROM src/controllers/file_11.js)
│       │   └── file_22.py                     (FROM src/controllers/file_22.js)
│       ├── domain/
│       │   ├── __init__.py                    (NEW)
│       │   ├── file_8.py                      (FROM src/domain/file_8.js)
│       │   └── file_19.py                     (FROM src/domain/file_19.js)
│       ├── middleware/
│       │   ├── __init__.py                    (NEW)
│       │   ├── file_5.py                      (FROM src/middleware/file_5.js)
│       │   ├── file_16.py                     (FROM src/middleware/file_16.js)
│       │   └── file_27.py                     (FROM src/middleware/file_27.js)
│       ├── models/
│       │   ├── __init__.py                    (NEW)
│       │   ├── file_2.py                      (FROM src/models/file_2.js)
│       │   ├── file_13.py                     (FROM src/models/file_13.js)
│       │   └── file_24.py                     (FROM src/models/file_24.js)
│       ├── repositories/
│       │   ├── __init__.py                    (NEW)
│       │   ├── file_7.py                      (FROM src/repositories/file_7.js)
│       │   └── file_18.py                     (FROM src/repositories/file_18.js)
│       ├── routes/
│       │   ├── __init__.py                    (NEW)
│       │   ├── file_3.py                      (FROM src/routes/file_3.js)
│       │   ├── file_14.py                     (FROM src/routes/file_14.js)
│       │   └── file_25.py                     (FROM src/routes/file_25.js)
│       ├── services/
│       │   ├── __init__.py                    (NEW)
│       │   ├── file_1.py                      (FROM src/services/file_1.js)
│       │   ├── file_12.py                     (FROM src/services/file_12.js)
│       │   └── file_23.py                     (FROM src/services/file_23.js)
│       └── utils/
│           ├── __init__.py                    (NEW)
│           ├── file_4.py                      (FROM src/utils/file_4.js)
│           ├── file_15.py                     (FROM src/utils/file_15.js)
│           ├── file_26.py                     (FROM src/utils/file_26.js)
│           └── filler.py                      (FROM src/utils/filler.js — comment-only)
└── tests/
    ├── __init__.py                            (NEW — namespace marker)
    ├── conftest.py                            (NEW — shared parametric fixtures)
    ├── integration/
    │   ├── __init__.py                        (NEW)
    │   ├── test_file_10.py                    (FROM tests/integration/file_10.js)
    │   └── test_file_21.py                    (FROM tests/integration/file_21.js)
    └── unit/
        ├── __init__.py                        (NEW)
        ├── test_file_9.py                     (FROM tests/unit/file_9.js)
        └── test_file_20.py                    (FROM tests/unit/file_20.js)
```

**Canonical content shape of each translated source module** (illustrative skeleton; every actual public symbol exposed by the corresponding JavaScript file MUST be present):

```python
"""mod_0 - society module."""
from society_mgmt._core import mod_compute as _mod_compute

mod_0_0 = _mod_compute
mod_0_1 = _mod_compute
# ... (one alias per JavaScript function, preserving every public name)

__all__ = ["mod_0_0", "mod_0_1", ...]
```

**Canonical content of `src/society_mgmt/_core.py`**:

```python
"""Shared closed-form implementation for the mod_N_M family.

The original JavaScript bodies all reduce to ``6 * x + 10`` for any
integer ``x`` (the conditional branch is always taken because 6x is even).
"""
def mod_compute(x: int) -> int:
    return 6 * x + 10
```

### 0.4.2 Web Search Research Conducted

To validate the modernization choices that govern the Python target, the following authoritative sources were consulted during this analysis pass.

- **Python release status** — confirmed via the official Python Developer's Guide that the current stable release branch is the latest 3.x line and that <cite index="10-4,10-5">"once a version has been fully released, bug fixes and security fixes are accepted. New binaries are built and released roughly every two months."</cite> The Python 3.12 line installed in the analysis environment is therefore an active, supported, full-feature target.
- **Latest pytest baseline** — confirmed against the official `pytest` PyPI release timeline that the 9.x series is current in 2025–2026, and verified locally that `pytest==9.0.3` installs and reports successfully against Python 3.12.3. The `pytest` PyPI package classifiers list <cite index="1-1">"Python :: 3.14"</cite> as supported, providing forward-compatibility headroom for the chosen baseline.
- **Refactoring discipline** — guidance from Real Python's curated best-practices reference establishes the operating definition the implementation MUST honor: <cite index="14-11">"Refactoring is the process of changing the internal structure of your source code to make it easier to understand and cheaper to modify without changing its observable behavior."</cite> This anchors the rule that every `mod_N_M(x)` Python function returns the identical numeric value as its JavaScript predecessor for every input.
- **Performance optimization within refactoring** — corroborated against general industry guidance that <cite index="15-1,15-2">"Refactoring can improve performance by identifying and removing redundant code, optimizing algorithms, and ensuring efficient memory usage. This contributes to faster and more reliable applications."</cite> The two performance levers exploited here — closed-form algebraic simplification (`6*x + 10`) and dead-code removal (`const store = []`) — fit this guidance exactly and require no algorithmic redesign.
- **Test-driven safety net** — refactoring practice <cite index="14-16,14-17,14-18,14-19">"Let tests guide your refactors. Maintain a solid test suite and run it during refactoring to ensure consistent behavior across all code changes. When behavior is covered by tests, you can reorganize code with more confidence. Tests confirm that the code's behavior hasn't changed."</cite> The Python port adopts pytest with `parametrize` to cover the entire input/output equivalence space, providing the behavioral safety net the user implicitly requires when stating "Ensure the functionality is not impacted."
- **Code-smell elimination** — the source's <cite index="14-20,14-21,14-22,14-23">"common code smells. Search for smelly things, such as long functions, deeply nested conditionals or loops, repeated code fragments, and objects with many responsibilities … These are signs that refactoring is needed. Address these gradually instead of waiting for a big rewrite."</cite> The dominant smell here is **repeated code fragments** at industrial scale (33,105 byte-identical bodies); the proposed deduplication via `_core.mod_compute` directly addresses this smell.

### 0.4.3 Design Pattern Applications

The Python target applies the following established design patterns, each chosen to address a specific characteristic of the source.

- **Façade via name aliasing** — Each translated module re-exports a single shared implementation under each of its public function names (e.g., `mod_0_0 = _mod_compute`). This preserves the source's flat public surface while collapsing 33,105 duplicated bodies into 1. The pattern is the "extract function" / "consolidate duplicate conditional fragments" refactoring applied at scale.
- **Module-level `__all__` discipline** — Each `*.py` translation declares an explicit `__all__` listing every public `mod_N_M` symbol exported by the JavaScript file it replaces, ensuring `from file_N import *` semantics are stable and do not leak the private `_mod_compute` alias.
- **Single-source-of-truth core** — The arithmetic is centralized in `src/society_mgmt/_core.py` so that any future correction or optimization (e.g., switching to `int(6 * x + 10)`, pre-computing a lookup table, or applying `@lru_cache`) can be made in one place and propagate to all 33,105 callable names without further edits.
- **Algebraic simplification** — The JavaScript body's five-statement chain plus conditional is replaced by the closed-form expression `6 * x + 10`. This is the classic "replace algorithm with simpler equivalent" refactoring and is the single most impactful per-call performance improvement available, reducing the bytecode footprint per call from ~7 instructions in CPython to ~2.
- **Dead-code elimination** — The unused `const store = [];` declaration is removed entirely because the symbol is unreferenced anywhere in the source tree. Carrying it forward as `store: list = []` in Python would reproduce the original waste with no observable benefit.
- **Parametric test consolidation** — Each pytest module uses `@pytest.mark.parametrize` to assert the closed-form equivalence over a representative input range (e.g., `range(-100, 101)`), providing strictly stronger coverage than the source's hand-unrolled-but-trivial test files at a fraction of the line count.
- **`src/`-layout packaging** — Python's modern `src/`-layout convention isolates installable code from repository-root scripts, eliminating the common pitfall of accidentally importing from the working directory rather than from the installed package, and aligning the project with the prevailing PyPA recommendations for new Python projects.

### 0.4.4 User Interface Design

Not applicable. The source codebase contains zero UI artifacts: no HTML, no CSS, no DOM manipulation, no React/Vue/Angular components, no template files, no static assets, no Figma attachments, and no design-system references. Every `mod_N_M(x)` function is a pure synchronous arithmetic transformation with no rendering, no input/output, and no presentation layer. The Python port therefore introduces no UI of its own.


## 0.5 Transformation Mapping

This sub-section provides the definitive source-to-target file map for the refactor. Every target file is mapped to a specific source file (or marked CREATE when no source equivalent exists), with the precise transformation that must be applied.

### 0.5.1 File-by-File Transformation Plan

The transformation table below is exhaustive for the in-scope file set defined in section 0.3.1. Each row binds one target file to its operation (UPDATE / CREATE / REFERENCE) and to a specific source file when one exists.

| Target File | Transformation | Source File | Key Changes |
|-------------|----------------|-------------|-------------|
| `README.md` | UPDATE | `README.md` | Append new "Python Port" section: install command (`pip install -e .[dev]`), test command (`pytest`), package layout summary, note that `society_mgmt_300k.zip` is preserved as historical reference. Retain the existing two-line introduction verbatim. |
| `LICENSE` | CREATE | `LICENSE/LICENSE.txt` | Hoist the bundled MIT license text to a repository-root `LICENSE` file. Preserve the entire text including "Copyright (c) 2026" exactly. |
| `pyproject.toml` | CREATE | — | New PEP 621 project manifest. Set `[project] name = "society-mgmt"`, `version = "0.1.0"`, `requires-python = ">=3.12"`, `[project.optional-dependencies] dev = ["pytest>=9.0.3"]`. Configure `[build-system] requires = ["setuptools>=68"]` and `build-backend = "setuptools.build_meta"`. Configure `[tool.setuptools.packages.find] where = ["src"]`. Configure `[tool.pytest.ini_options] testpaths = ["tests"]` and `pythonpath = ["src"]`. |
| `requirements-dev.txt` | CREATE | — | Single-line file containing `pytest==9.0.3` to pin the development dependency. |
| `.gitignore` | CREATE | — | Standard Python ignore patterns: `__pycache__/`, `*.pyc`, `*.pyo`, `.pytest_cache/`, `*.egg-info/`, `dist/`, `build/`, `.venv/`, `venv/`, `.coverage`. |
| `src/society_mgmt/__init__.py` | CREATE | — | Top-level package marker. Expose package version (`__version__ = "0.1.0"`). Optionally re-export sub-package namespaces. |
| `src/society_mgmt/_core.py` | CREATE | — | Define `def mod_compute(x: int) -> int: return 6 * x + 10` with module docstring explaining the algebraic equivalence to the original JavaScript body. Provide `__all__ = ["mod_compute"]`. |
| `src/society_mgmt/config/__init__.py` | CREATE | — | Sub-package marker. May re-export `from .file_6 import *` and `from .file_17 import *`. |
| `src/society_mgmt/config/file_6.py` | CREATE | `src/config/file_6.js` | Translate JavaScript module: module docstring `"""mod_6 - society module."""`; import `mod_compute as _mod_compute` from `society_mgmt._core`; alias every original function name `mod_6_0` … `mod_6_1199` to `_mod_compute`; declare `__all__` listing all 1,200 names. Drop the dead `const store = [];` declaration. |
| `src/society_mgmt/config/file_17.py` | CREATE | `src/config/file_17.js` | Same pattern as `config/file_6.py`, aliasing `mod_17_0` … `mod_17_1199`. |
| `src/society_mgmt/controllers/__init__.py` | CREATE | — | Sub-package marker for controllers layer. |
| `src/society_mgmt/controllers/file_0.py` | CREATE | `src/controllers/file_0.js` | Same pattern, aliasing `mod_0_0` … `mod_0_1199`. |
| `src/society_mgmt/controllers/file_11.py` | CREATE | `src/controllers/file_11.js` | Same pattern, aliasing `mod_11_0` … `mod_11_1199`. |
| `src/society_mgmt/controllers/file_22.py` | CREATE | `src/controllers/file_22.js` | Same pattern, aliasing `mod_22_0` … `mod_22_1199`. |
| `src/society_mgmt/domain/__init__.py` | CREATE | — | Sub-package marker for domain layer. |
| `src/society_mgmt/domain/file_8.py` | CREATE | `src/domain/file_8.js` | Same pattern, aliasing `mod_8_0` … `mod_8_1199`. |
| `src/society_mgmt/domain/file_19.py` | CREATE | `src/domain/file_19.js` | Same pattern, aliasing `mod_19_0` … `mod_19_1199`. |
| `src/society_mgmt/middleware/__init__.py` | CREATE | — | Sub-package marker for middleware layer. |
| `src/society_mgmt/middleware/file_5.py` | CREATE | `src/middleware/file_5.js` | Same pattern, aliasing `mod_5_0` … `mod_5_1199`. |
| `src/society_mgmt/middleware/file_16.py` | CREATE | `src/middleware/file_16.js` | Same pattern, aliasing `mod_16_0` … `mod_16_1199`. |
| `src/society_mgmt/middleware/file_27.py` | CREATE | `src/middleware/file_27.js` | Same pattern, aliasing `mod_27_0` … `mod_27_704` (note: 705 names, NOT 1,200 — this file is the smaller variant). |
| `src/society_mgmt/models/__init__.py` | CREATE | — | Sub-package marker for models layer. |
| `src/society_mgmt/models/file_2.py` | CREATE | `src/models/file_2.js` | Same pattern, aliasing `mod_2_0` … `mod_2_1199`. |
| `src/society_mgmt/models/file_13.py` | CREATE | `src/models/file_13.js` | Same pattern, aliasing `mod_13_0` … `mod_13_1199`. |
| `src/society_mgmt/models/file_24.py` | CREATE | `src/models/file_24.js` | Same pattern, aliasing `mod_24_0` … `mod_24_1199`. |
| `src/society_mgmt/repositories/__init__.py` | CREATE | — | Sub-package marker for repositories layer. |
| `src/society_mgmt/repositories/file_7.py` | CREATE | `src/repositories/file_7.js` | Same pattern, aliasing `mod_7_0` … `mod_7_1199`. |
| `src/society_mgmt/repositories/file_18.py` | CREATE | `src/repositories/file_18.js` | Same pattern, aliasing `mod_18_0` … `mod_18_1199`. |
| `src/society_mgmt/routes/__init__.py` | CREATE | — | Sub-package marker for routes layer. |
| `src/society_mgmt/routes/file_3.py` | CREATE | `src/routes/file_3.js` | Same pattern, aliasing `mod_3_0` … `mod_3_1199`. |
| `src/society_mgmt/routes/file_14.py` | CREATE | `src/routes/file_14.js` | Same pattern, aliasing `mod_14_0` … `mod_14_1199`. |
| `src/society_mgmt/routes/file_25.py` | CREATE | `src/routes/file_25.js` | Same pattern, aliasing `mod_25_0` … `mod_25_1199`. |
| `src/society_mgmt/services/__init__.py` | CREATE | — | Sub-package marker for services layer. |
| `src/society_mgmt/services/file_1.py` | CREATE | `src/services/file_1.js` | Same pattern, aliasing `mod_1_0` … `mod_1_1199`. |
| `src/society_mgmt/services/file_12.py` | CREATE | `src/services/file_12.js` | Same pattern, aliasing `mod_12_0` … `mod_12_1199`. |
| `src/society_mgmt/services/file_23.py` | CREATE | `src/services/file_23.js` | Same pattern, aliasing `mod_23_0` … `mod_23_1199`. |
| `src/society_mgmt/utils/__init__.py` | CREATE | — | Sub-package marker for utils layer. |
| `src/society_mgmt/utils/file_4.py` | CREATE | `src/utils/file_4.js` | Same pattern, aliasing `mod_4_0` … `mod_4_1199`. |
| `src/society_mgmt/utils/file_15.py` | CREATE | `src/utils/file_15.js` | Same pattern, aliasing `mod_15_0` … `mod_15_1199`. |
| `src/society_mgmt/utils/file_26.py` | CREATE | `src/utils/file_26.js` | Same pattern, aliasing `mod_26_0` … `mod_26_1199`. |
| `src/society_mgmt/utils/filler.py` | CREATE | `src/utils/filler.js` | Translate the comment-only filler file. Reproduce the 1,999 `// filler N` lines as Python `# filler N` comments preserving the numbering exactly. No executable code; no `__all__`; module docstring `"""Comment-only filler module preserved from the original JavaScript codebase."""`. |
| `tests/__init__.py` | CREATE | — | Empty namespace marker (single line). |
| `tests/conftest.py` | CREATE | — | Define a shared `@pytest.fixture` named `mod_input_range` returning a sampled list of integer inputs (e.g., `[-100, -10, -1, 0, 1, 10, 100, 1000]`) used by every test module to drive parametric assertions. |
| `tests/integration/__init__.py` | CREATE | — | Empty namespace marker. |
| `tests/integration/test_file_10.py` | CREATE | `tests/integration/file_10.js` | Pytest module: import `from society_mgmt.<owning_layer>.file_10 import *` (where applicable) or import the public symbols by reflection; use `@pytest.mark.parametrize` to assert `mod_10_M(x) == 6*x + 10` for every M and every x in the shared input range. |
| `tests/integration/test_file_21.py` | CREATE | `tests/integration/file_21.js` | Same pattern as `test_file_10.py`, asserting equivalence for the `mod_21_*` family. |
| `tests/unit/__init__.py` | CREATE | — | Empty namespace marker. |
| `tests/unit/test_file_9.py` | CREATE | `tests/unit/file_9.js` | Pytest module asserting equivalence for the `mod_9_*` family with parametric coverage. |
| `tests/unit/test_file_20.py` | CREATE | `tests/unit/file_20.js` | Pytest module asserting equivalence for the `mod_20_*` family with parametric coverage. |
| `society_mgmt_300k.zip` | UNCHANGED | — | Repository-root archive is NOT touched. |
| `LICENSE/LICENSE.txt` (inside zip) | UNCHANGED | — | Bundled file inside the archive is NOT touched (the hoisted `LICENSE` at repo root preserves its content). |

**Wildcard generalization for clarity** (these patterns describe the rows above, not new rows):

- `src/<layer>/file_*.js` → `src/society_mgmt/<layer>/file_*.py` for every `<layer>` in `{config, controllers, domain, middleware, models, repositories, routes, services, utils}` — translates each JavaScript module to its Python equivalent under the same layer.
- `tests/<kind>/file_*.js` → `tests/<kind>/test_file_*.py` for `<kind>` in `{integration, unit}` — translates each JavaScript test to a pytest module with the `test_` prefix that pytest's default collection rules require.
- `src/society_mgmt/<layer>/__init__.py` for every `<layer>` listed above — sub-package marker created once per layer.

### 0.5.2 Cross-File Dependencies

Because the source has no inter-file imports (verified in section 0.2 via repository-wide grep returning zero matches for `require`, `module.exports`, `import `, `export `), there are no existing import statements to update. The cross-file dependency surface in the Python target is created entirely fresh, and consists of exactly one inbound edge per translated module.

- **Single uniform import contract** — Every translated `*.py` source module imports exactly one symbol from exactly one place:

```python
from society_mgmt._core import mod_compute as _mod_compute
```

- **Test-side import contract** — Every pytest module imports the corresponding source module by its package path:

```python
from society_mgmt.<layer> import file_N
# then iterate or parametrize over file_N.__all__ to assert behavior

```

- **No transitive imports across layers** — Controllers do not import services, services do not import repositories, etc., because the source establishes no such relationships. The Python port preserves this isolation; introducing inter-layer imports would alter the source's externally observable module dependency graph.

- **Configuration updates for new structure** — None needed inside the Python source modules themselves. The `pyproject.toml` `[tool.pytest.ini_options]` table sets `pythonpath = ["src"]` so that pytest resolves `society_mgmt` without requiring an `pip install -e .` step in CI; for editable installs, `pip install -e .[dev]` is the documented path.

- **Test file import corrections** — N/A. The original JavaScript tests have no imports at all (they reside in their own self-contained files). The pytest replacements introduce imports fresh as part of file CREATE.

### 0.5.3 Wildcard Patterns

All wildcard patterns used in this Action Plan are TRAILING wildcards anchored to a specific directory. No leading wildcards (`**/foo`) are used because every in-scope path is bounded by an explicit prefix derived from the source analysis.

- ✓ Permitted patterns used here:
    - `src/config/file_*.js` → `src/society_mgmt/config/file_*.py`
    - `src/controllers/file_*.js` → `src/society_mgmt/controllers/file_*.py`
    - `src/domain/file_*.js` → `src/society_mgmt/domain/file_*.py`
    - `src/middleware/file_*.js` → `src/society_mgmt/middleware/file_*.py`
    - `src/models/file_*.js` → `src/society_mgmt/models/file_*.py`
    - `src/repositories/file_*.js` → `src/society_mgmt/repositories/file_*.py`
    - `src/routes/file_*.js` → `src/society_mgmt/routes/file_*.py`
    - `src/services/file_*.js` → `src/society_mgmt/services/file_*.py`
    - `src/utils/file_*.js` → `src/society_mgmt/utils/file_*.py`
    - `src/utils/filler.js` → `src/society_mgmt/utils/filler.py` (single-file mapping; no wildcard)
    - `tests/integration/file_*.js` → `tests/integration/test_file_*.py`
    - `tests/unit/file_*.js` → `tests/unit/test_file_*.py`
- ✗ Patterns explicitly NOT used (no leading wildcards): `**/file_*.js`, `**/models/**`, `*.js`, `tests/**/*.js`. Each in-scope file has been individually enumerated in the table above so that the implementation phase has zero ambiguity about which paths are touched.

### 0.5.4 One-phase Execution

The entire refactor is executed by Blitzy in ONE phase. There is no multi-phase plan, no preparatory commit, no compatibility shim phase, and no sunset phase. All file CREATEs and UPDATEs listed in the transformation table above are applied together within a single commit/PR boundary, after which the Python tree is the canonical source of truth for the project's behavior. The original `society_mgmt_300k.zip` archive is retained at the repository root for historical reference but is never re-introduced into the working tree.


## 0.6 Dependency Inventory

This sub-section catalogs every runtime, library, and tooling dependency that the post-refactor Python project depends on. The source JavaScript codebase has no `package.json`, no `node_modules`, and no `require()` calls anywhere in its 300,000 lines, so there are no existing dependencies to translate; every entry in the table below is a NEW dependency introduced by the Python port itself.

### 0.6.1 Key Private and Public Packages

| Registry | Package | Version | Type | Purpose |
|----------|---------|---------|------|---------|
| python.org | CPython | 3.12 (`>=3.12`) | Runtime | Target interpreter for the refactored codebase. Selected as the highest stable Python branch verified locally during the analysis pass (`python3 --version` reports `Python 3.12.3`). The `pyproject.toml` `requires-python` constraint is set to `>=3.12` to accept any 3.12 patch release while leaving headroom for 3.13 and 3.14 deployments. |
| PyPI | `setuptools` | `>=68` | Build backend | PEP 517/PEP 621 build backend for assembling the `society-mgmt` distribution from the `src/` layout. Declared in `pyproject.toml` `[build-system]`. |
| PyPI | `pytest` | `9.0.3` | Dev / Test | Primary test runner and assertion framework for the translated `tests/unit/test_*.py` and `tests/integration/test_*.py` modules. Pinned to `9.0.3` because that is the version verified to install and import successfully in the analysis environment. The pytest project advertises support for <cite index="1-1,1-2">Python 3.14, with 9.0.3 released on Apr 7, 2026 and prior versions including 9.0.2 (Dec 6, 2025), 9.0.1 (Nov 12, 2025), 9.0.0 (Nov 8, 2025)</cite>, confirming this pin sits on the current major series. |

There are no other public or private packages in scope. Specifically:

- **No web frameworks** — No FastAPI, Flask, Django, Starlette, aiohttp, Tornado, or Bottle. The source exposes no HTTP surface; introducing one would expand scope beyond the user's request.
- **No ORMs or persistence libraries** — No SQLAlchemy, Tortoise, Peewee, MongoEngine, or pymongo. The source has no persistence and no I/O.
- **No serialization libraries** — No Pydantic, marshmallow, or attrs. No data-class shapes are required because the public surface is `int → int` only.
- **No async libraries** — No `httpx`, `aiohttp`, `trio`, or `anyio`. The source is fully synchronous.
- **No logging or observability libraries** — No `structlog`, `loguru`, `opentelemetry-*`, or `sentry-sdk`. The source has no logging and no telemetry.
- **No private packages** — The user has not specified any internal/private package indexes, monorepo workspaces, or proprietary libraries that the Python port must consume.

### 0.6.2 Dependency Updates

#### Import Refactoring

Because the source codebase contains no `require()`, `module.exports`, `import `, or `export ` statements anywhere in its 29 files (verified by repository-wide grep producing zero matches), there are no existing imports to refactor. The Python target instead introduces a small, uniform import surface.

- **Files receiving the canonical core import** — every Python source module under `src/society_mgmt/<layer>/file_*.py`:
    - Old (JavaScript): no equivalent — the source modules are import-free.
    - New (Python): `from society_mgmt._core import mod_compute as _mod_compute`
    - Apply to: every translated source module listed in the section 0.5.1 transformation table.

- **Files receiving the canonical test import** — every pytest module under `tests/unit/test_*.py` and `tests/integration/test_*.py`:
    - Old (JavaScript): no equivalent — the source tests are import-free.
    - New (Python): `from society_mgmt.<layer> import file_N` plus the standard pytest `import pytest`.
    - Apply to: every translated test module listed in the section 0.5.1 transformation table.

- **Files receiving the package-level shared fixture import** — `tests/conftest.py`:
    - New (Python): `import pytest` only; defines fixtures consumed implicitly by pytest's discovery.

#### External Reference Updates

- **Configuration files**:
    - `pyproject.toml` (CREATE) — declares `[project]`, `[build-system]`, `[project.optional-dependencies]`, `[tool.setuptools.packages.find]`, and `[tool.pytest.ini_options]` tables.
    - `requirements-dev.txt` (CREATE) — pins `pytest==9.0.3` for reproducible developer setup.
    - `.gitignore` (CREATE) — Python ignore patterns covering `__pycache__/`, `*.pyc`, `*.pyo`, `.pytest_cache/`, `*.egg-info/`, `dist/`, `build/`, `.venv/`, `venv/`, `.coverage`.

- **Documentation**:
    - `README.md` (UPDATE) — append a "Python Port" section describing install (`pip install -e .[dev]`), test (`pytest`), and package layout. Retain the pre-existing two-line introduction unchanged.

- **Build files**:
    - `pyproject.toml` is the sole build descriptor. No `setup.py`, no `setup.cfg`, no `Pipfile`, no `poetry.lock`, no `tox.ini`, no `MANIFEST.in` are introduced (none are needed for this scope).

- **CI/CD**:
    - No `.github/workflows/*.yml`, no `.gitlab-ci.yml`, no Jenkinsfile changes — there is no existing CI pipeline in the repository, and CI configuration is OUT OF SCOPE per section 0.3.2.


## 0.7 Refactoring Rules

This sub-section captures every behavioral, structural, and quality rule that the implementation phase MUST honor. The rules combine explicit user directives with implicit constraints derived from the source's observable behavior and the user's stated goals of preserving functionality and improving performance.

### 0.7.1 Refactoring-Specific Rules

The following rules are mandatory and non-negotiable for the implementation phase.

- **Behavioral equivalence is absolute**. For every public function `mod_N_M` in the source tree and its Python counterpart, the equality `python_mod_N_M(x) == javascript_mod_N_M(x)` MUST hold for every numeric input that the source accepts. The user's directive "Ensure the functionality is not impacted" is interpreted as bit-for-bit return-value equality on the integer inputs that exercise the public surface. The closed-form `6 * x + 10` is mathematically equal to the source body for every integer x because the conditional `r % 2 === 0` evaluates true whenever `r = 6x` (which is always, since 6 is even).

- **Public symbol names MUST be preserved verbatim**. Every JavaScript function name must appear as a Python module attribute of identical spelling. Renaming `mod_0_0` to `mod_0_0_compute`, `compute_0_0`, or any other variant is forbidden. The Python module's `__all__` lists every original name explicitly.

- **Public arity MUST be preserved**. Each function continues to accept exactly one positional parameter (`x`). Adding default arguments, keyword-only arguments, `*args`, `**kwargs`, or type annotations that change the call surface is forbidden. Adding a non-call-surface-affecting type annotation (`x: int`) on the shared `_mod_compute` helper is permitted because the helper is private.

- **Folder taxonomy MUST be preserved**. The nine source layers (`config`, `controllers`, `domain`, `middleware`, `models`, `repositories`, `routes`, `services`, `utils`) and the two test categories (`integration`, `unit`) MUST appear under `src/society_mgmt/` and `tests/` respectively in the Python target with identical names. Renaming, merging, or splitting layers is forbidden.

- **File-name correspondence MUST be one-to-one**. For every JavaScript file `file_N.js` there is exactly one Python file `file_N.py` (or `test_file_N.py` for tests). No JavaScript file is split into multiple Python files; no two JavaScript files are merged into a single Python file.

- **Tests MUST pass at the end of the refactor**. The implementation phase concludes with `pytest` executed against the Python target tree, exiting with status 0 and reporting zero test failures. The user's directive "Ensure the functionality is not impacted" is operationalized through this gate.

- **Performance MUST be measurably improved**. The user's directive "the performance is issues so while refactoring do ensure performance is imrpoved [sic]" is satisfied by the closed-form simplification (5 statements + 1 conditional collapsed to 1 expression), the dead-code elimination of `const store = []`, and the deduplication of 33,105 byte-identical bodies into one shared implementation. No alternative interpretation of "performance" (e.g., async, multiprocessing, JIT compilation, native extensions) is required or permitted.

- **Backward compatibility within Python**: external Python consumers that import the package by `from society_mgmt.<layer>.file_N import mod_N_M` or `from society_mgmt.<layer>.file_N import *` MUST continue to resolve every public symbol after the refactor. The `__all__` discipline guarantees this for `import *` consumers; the explicit module attribute assignments (`mod_N_M = _mod_compute`) guarantee it for direct attribute lookup.

### 0.7.2 Special Instructions and Constraints

The user explicitly stated the following constraints (preserved verbatim and labeled):

- **User Example: "Refactor the code from javascript to python."** — Interpreted as a complete cross-language port of every `*.js` file in `society_mgmt_300k.zip` to a Python equivalent under the `src/society_mgmt/` package. No subset, no partial port, no language other than Python.

- **User Example: "Ensure the functionality is not impacted."** — Interpreted as the absolute behavioral-equivalence rule documented in section 0.7.1. Operationalized via pytest assertions covering every public symbol against a parametric input range.

- **User Example: "Also the performance is issues so while refactoring do ensure performance is imrpoved."** — Interpreted as a requirement to actively reduce per-call CPU work, eliminate dead allocations, and remove duplicated source. Operationalized via closed-form simplification, dead-code removal, and function-body deduplication. Adding micro-optimizations beyond these (Cython compilation, ctypes wrappers, lookup tables, `@lru_cache`) is permitted only if they preserve every other rule in this section; the baseline plan does not require them and treats them as OUT OF SCOPE unless they fall out naturally from the simplification.

- **User Rule (`Ajit_refactor_Simple`): "Refactor the existing code to optimize the code quality and performance."** — Reinforces the dual mandate of code quality (deduplication via `_core.mod_compute`, dead-code removal, idiomatic Python) and performance (closed-form arithmetic, eliminated branch). Both code-quality wins and performance wins are jointly required.

The following implicit constraints derived from the source observation are also enforced:

- **Migration-to-new-repository rules**: NOT applicable. The user did not request a new repository; the Python port lives in the same repository alongside the original `society_mgmt_300k.zip`.

- **Public-API preservation across languages**: The "public API" in this codebase consists exclusively of the 33,105 named functions. Each of these names MUST resolve in Python at the same logical module path that mirrors the JavaScript source path (e.g., the JavaScript `src/controllers/file_0.js`'s `mod_0_0` becomes Python's `society_mgmt.controllers.file_0.mod_0_0`).

- **Test coverage preservation**: The four JavaScript test files cover four sets of `mod_N_*` symbols (`mod_9_*`, `mod_10_*`, `mod_20_*`, `mod_21_*`). The four corresponding Python test files MUST cover the same families, and the parametric test design MUST cover at least the symbol-and-input space that a transliteration of the original tests would have covered. Reducing the symbol coverage is forbidden; expanding it via parametrize is encouraged.

- **Numeric-model awareness**: JavaScript numbers are IEEE 754 doubles; Python distinguishes `int` (arbitrary precision) from `float`. Because the formula `6*x + 10` involves only addition and multiplication of integers, both languages produce identical results for every integer input within JavaScript's safe-integer range (`2**53 - 1` and below). The implementation MUST NOT silently coerce inputs to `float`; tests SHOULD include integer inputs across a representative range to make this explicit.

- **No silent removal of files**: Every JavaScript file enumerated in section 0.2.1 produces exactly one corresponding Python file in section 0.5.1. No JavaScript file is deleted without a Python replacement; no Python target is created without a JavaScript source equivalent (except the package scaffolding files explicitly marked CREATE in section 0.5.1).

- **Web-search research applied**: The implementation has been informed by current pytest documentation, current Python release-status guidance, and Real Python's refactoring best-practices reference (see citations in section 0.4.2). No additional research is pending.


## 0.8 References

This sub-section enumerates every artifact, file, folder, and external source consulted during the production of this Agent Action Plan. It serves as the audit trail for every conclusion reached above.

### 0.8.1 Files Examined in the Repository

The following repository paths were retrieved or inspected during analysis. Each is listed with its role in the analysis.

| Path | Type | Source of Inspection | Role in Analysis |
|------|------|----------------------|------------------|
| `/` (repository root) | Folder | `get_source_folder_contents` | Confirmed the working tree contains only `README.md` and `society_mgmt_300k.zip` at top level. |
| `README.md` | File | `read_file` | Established that the repository is named "Ajit-backprop-test" and is described as a "test project for backprop integration." |
| `society_mgmt_300k.zip` | File (binary) | `bash` (Python `zipfile` extraction to `/tmp/extracted_zip`) | Yielded the JavaScript source tree that constitutes the entire refactor scope. |
| `LICENSE/LICENSE.txt` (inside zip) | File | `bash head` | Confirmed MIT License with "Copyright (c) 2026". |
| `src/config/file_6.js`, `src/config/file_17.js` | Files | `bash wc`, `bash grep`, `bash head` | Sampled to confirm `mod_6_M`, `mod_17_M` function patterns and 1,200/10,802 size signature. |
| `src/controllers/file_0.js`, `src/controllers/file_11.js`, `src/controllers/file_22.js` | Files | `bash wc`, `bash grep`, `bash head/tail` | Sampled `file_0.js` first 80 lines and last 30 lines to verify uniform body across `mod_0_0` … `mod_0_1199`. |
| `src/domain/file_8.js`, `src/domain/file_19.js` | Files | `bash wc`, `bash grep`, `bash head` | Sampled `file_8.js` first 30 lines to confirm domain-layer pattern. |
| `src/middleware/file_5.js`, `src/middleware/file_16.js`, `src/middleware/file_27.js` | Files | `bash wc`, `bash grep`, `bash head` | Sampled `file_5.js` and identified `file_27.js` as the smaller variant with 705 functions / 6,347 lines. |
| `src/models/file_2.js`, `src/models/file_13.js`, `src/models/file_24.js` | Files | `bash wc`, `bash grep`, `bash head` | Sampled `file_2.js` to confirm models-layer pattern. |
| `src/repositories/file_7.js`, `src/repositories/file_18.js` | Files | `bash wc`, `bash grep`, `bash head` | Sampled `file_7.js` to confirm repositories-layer pattern. |
| `src/routes/file_3.js`, `src/routes/file_14.js`, `src/routes/file_25.js` | Files | `bash wc`, `bash grep`, `bash head` | Sampled `file_3.js` to confirm routes-layer pattern. |
| `src/services/file_1.js`, `src/services/file_12.js`, `src/services/file_23.js` | Files | `bash wc`, `bash grep`, `bash head` | Sampled `file_1.js` first 80 lines to confirm services-layer pattern. |
| `src/utils/file_4.js`, `src/utils/file_15.js`, `src/utils/file_26.js` | Files | `bash wc`, `bash grep`, `bash head` | Sampled `file_4.js` to confirm utils-layer pattern. |
| `src/utils/filler.js` | File | `bash wc`, `bash head` | Confirmed comment-only file (`// filler 298001` … `// filler 300000`), 1,999 lines, zero functions. |
| `tests/integration/file_10.js`, `tests/integration/file_21.js` | Files | `bash wc`, `bash grep` | Confirmed test files share the same structural pattern as source modules, 1,200 functions each. |
| `tests/unit/file_9.js`, `tests/unit/file_20.js` | Files | `bash head`, `bash wc`, `bash grep` | Sampled `tests/unit/file_9.js` first 50 lines to confirm unit-test pattern. |

### 0.8.2 Searches Conducted

The following analysis-time searches were executed and informed the conclusions in this Action Plan.

- **`.blitzyignore` discovery** — `find / -name ".blitzyignore" -type f` and `find . -name ".blitzyignore"` — both returned zero matches, confirming no path-pattern exclusions apply to this refactor.
- **JavaScript file enumeration** — `find /tmp/extracted_zip -type f -name "*.js"` — returned the complete 29-file JavaScript inventory.
- **Module-system surface** — `grep -l "require\|module.exports\|import \|export "` across `src/**/*.js` and `tests/**/*.js` — returned zero files, confirming the source has no inter-module dependencies.
- **External-side-effect surface** — `grep -rn "async\|await\|Promise\|callback\|Date\."` — returned zero matches, confirming the source is fully synchronous, side-effect-free arithmetic.
- **Dead-code confirmation** — `grep "store\.|store\[|store("` across the source tree — returned zero matches, confirming the module-level `const store = [];` is unreferenced.
- **Function-body uniqueness** — line-level extraction and `sort -u` across multiple sampled source files — returned identical 7-line bodies in every sampled file, supporting the deduplication strategy.
- **Function-count enumeration** — `grep -c "^function mod_"` per file — produced the exact per-file counts (1,200 for 27 files, 705 for `src/middleware/file_27.js`, 0 for `src/utils/filler.js`).

### 0.8.3 External References

The following external sources were consulted via `web_search` to validate the modernization choices documented in section 0.4.

- **PyPI: pytest project page** (`https://pypi.org/project/pytest/`) — Source for the latest stable pytest version timeline. <cite index="1-1,1-2">Confirmed pytest 9.0.3 (Apr 7, 2026), 9.0.2 (Dec 6, 2025), 9.0.1 (Nov 12, 2025), 9.0.0 (Nov 8, 2025), and that the package classifies "Python :: 3.14" support.</cite>
- **Python Developer's Guide: Status of Python versions** (`https://devguide.python.org/versions/`) — Source for the official Python release-cycle policy. <cite index="10-4,10-5,10-6,10-7">Confirmed that "Once a version has been fully released, bug fixes and security fixes are accepted. New binaries are built and released roughly every two months. This phase is also called maintenance mode or stable release. After two years (18 months for versions before 3.13), only security fixes are accepted and no more binaries are released."</cite>
- **Real Python: Refactoring best practices** (`https://realpython.com/ref/best-practices/refactoring/`) — Source for the refactoring discipline applied here. <cite index="14-11">Defines refactoring as "the process of changing the internal structure of your source code to make it easier to understand and cheaper to modify without changing its observable behavior."</cite> <cite index="14-16,14-17,14-18,14-19">Establishes the test-driven safety-net principle that "Let tests guide your refactors. Maintain a solid test suite and run it during refactoring to ensure consistent behavior across all code changes. When behavior is covered by tests, you can reorganize code with more confidence. Tests confirm that the code's behavior hasn't changed."</cite>
- **Maruti Tech: Code refactoring best practices** (`https://marutitech.com/code-refactoring-best-practices/`) — Source for the performance-via-refactoring guidance. <cite index="15-1,15-2">Confirms that "Refactoring can improve performance by identifying and removing redundant code, optimizing algorithms, and ensuring efficient memory usage. This contributes to faster and more reliable applications."</cite>

### 0.8.4 User-Provided Attachments

The user attached the following items to this project. Each is enumerated below with its location, content summary, and role in the refactor.

| Attachment | Location | Content Summary | Role in Refactor |
|------------|----------|-----------------|------------------|
| `README.md` | Repository root, pre-existing | Two-line Markdown file: "# Ajit-backprop-test" / "test project for backprop integration." | UPDATE target — extended with a Python Port section per section 0.5.1. |
| `society_mgmt_300k.zip` | Repository root, 105,459 bytes | ZIP archive containing the entire JavaScript source tree to refactor: `LICENSE/LICENSE.txt` (MIT, 2026); `src/` with 25 `.js` files across nine architectural layers; `tests/` with four `.js` test files across `unit` and `integration`; total 300,000 lines and 33,105 `mod_N_M` function definitions, all with byte-identical bodies. | Sole source of truth for the refactor. UNCHANGED at the file system level — preserved as historical reference. |
| User implementation rule `Ajit_refactor_Simple` | Provided in prompt | "Refactor the existing code to optimize the code quality and performance." | Reinforces the dual mandate of code-quality optimization (deduplication, dead-code removal, idiomatic Python) and performance optimization (closed-form arithmetic, eliminated branch). Honored throughout sections 0.4 and 0.7. |

### 0.8.5 User-Provided Figma Designs

None. The user attached zero Figma URLs and zero design-system references to this project. The `frame name`, `URL`, and `description` columns that this section would otherwise populate are intentionally empty because the source codebase has no UI surface and the user's request makes no mention of any visual design.

### 0.8.6 Setup and Environment Notes

- **Runtime version selected**: Python 3.12 (verified locally as `Python 3.12.3`). Selected by the rule "highest explicitly documented supported version" applied to a greenfield Python project with no pre-existing manifest — in the absence of any project-declared constraint, the analysis-environment installation is the highest verified version.
- **Test framework version selected**: `pytest==9.0.3` (verified locally with `python3 -c "import pytest; print(pytest.__version__)"` reporting `9.0.3`). Pinned exactly in `requirements-dev.txt`.
- **Build backend selected**: `setuptools >= 68` via PEP 517 / `pyproject.toml`. Chosen as the most universally available and lowest-friction backend for a `src/`-layout project with no native extensions.
- **No `.blitzyignore` exclusions apply** to any path in the analysis or implementation phase.
- **No setup-time issues encountered**. The Python interpreter, `pip`, `pytest`, and `unittest` were all available or installable in the analysis environment.


