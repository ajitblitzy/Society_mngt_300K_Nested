# Ajit-backprop-test
test project for backprop integration.

## Python Port

This repository now hosts an idiomatic Python port of the original JavaScript
codebase that was previously archived in `society_mgmt_300k.zip`. The Python
tree lives under `src/society_mgmt/` and exposes the same public function
surface (`mod_N_M(x)`) under the same logical layer taxonomy
(`config`, `controllers`, `domain`, `middleware`, `models`, `repositories`,
`routes`, `services`, `utils`).

Every original `mod_N_M` function name is preserved verbatim and re-exported
as a Python alias of a single shared closed-form implementation, eliminating
the source's 33,105-fold duplication while guaranteeing byte-identical return
values for every input.

### Requirements

- Python `>=3.12`
- `pytest>=9.0.3` (pinned in `requirements-dev.txt`)

### Installation

Install the package in editable mode along with the development dependencies:

```bash
pip install -e .[dev]
```

### Running the Tests

After installation, run the full test suite from the repository root:

```bash
pytest
```

### Package Layout

```
src/society_mgmt/
├── __init__.py
├── _core.py              # shared mod_compute(x) -> 6 * x + 10 helper
├── config/               # file_6.py, file_17.py
├── controllers/          # file_0.py, file_11.py, file_22.py
├── domain/               # file_8.py, file_19.py
├── middleware/           # file_5.py, file_16.py, file_27.py
├── models/               # file_2.py, file_13.py, file_24.py
├── repositories/         # file_7.py, file_18.py
├── routes/               # file_3.py, file_14.py, file_25.py
├── services/             # file_1.py, file_12.py, file_23.py
└── utils/                # file_4.py, file_15.py, file_26.py, filler.py

tests/
├── __init__.py
├── conftest.py           # shared parametric fixtures
├── unit/                 # test_file_9.py, test_file_20.py
└── integration/          # test_file_10.py, test_file_21.py
```

Each layer sub-package contains `file_*.py` modules whose original
`mod_N_M` function names are re-exported as aliases of the shared
`society_mgmt._core.mod_compute` helper.

### Migration Note

The original `society_mgmt_300k.zip` archive at the repository root is
preserved as a historical reference of the pre-refactor JavaScript source.
It is **not** extracted into the working tree, modified, or re-zipped.
The Python tree under `src/society_mgmt/` is the canonical source of truth
for the project's behavior going forward.
