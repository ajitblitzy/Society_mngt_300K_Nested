# Society Management

A layered Node.js / JavaScript codebase organized into 28 self-contained **module identities** (`mod_0` … `mod_27`), one per source file, under a conventional society-management directory taxonomy.

## Overview

The Society Management codebase is delivered as the archive `society_mgmt_300k.zip` at the repository root and is organized into a layered directory taxonomy. Source code lives under `src/` across nine layers — `controllers`, `services`, `models`, `routes`, `utils`, `middleware`, `config`, `repositories`, and `domain` — while tests live under `tests/` across two layers, `unit` and `integration`.

Every source and test file represents exactly one **module identity**. Each file opens with the header `// mod_N - society module` on its first line, followed by a file-scoped `const store = [];`, and then declares a sequence of functions named `mod_N_M(x)` (module `N`, ordinal `M`). There are 28 identities in total (`mod_0` … `mod_27`), one per file. *(Source: `src/controllers/file_0.js:L1-L2`)*

## Important: Synthetic Codebase

> **Note — the code is synthetic.** Although the directory names (`controllers`, `services`, `models`, …) suggest a society-management application, the files contain **no business logic and no framework wiring**. Every function performs the *same* synthetic arithmetic: it accumulates `x*1 + x*2 + x*3`, adds `10` when the running total is even, and returns the resulting number. There are no `module.exports` / `require` statements and no Express, Mongoose, or Sequelize usage; all functions are file-scoped, non-exported declarations. This documentation therefore describes only what is actually present and does not attribute any member-management, billing, or similar feature to the code. *(Source: `src/controllers/file_0.js:L3-L10`)*

## Repository Structure

| Layer (directory) | Files | Module identities |
| --- | --- | --- |
| `src/controllers/` | `file_0.js`, `file_11.js`, `file_22.js` | `mod_0`, `mod_11`, `mod_22` |
| `src/services/` | `file_1.js`, `file_12.js`, `file_23.js` | `mod_1`, `mod_12`, `mod_23` |
| `src/models/` | `file_2.js`, `file_13.js`, `file_24.js` | `mod_2`, `mod_13`, `mod_24` |
| `src/routes/` | `file_3.js`, `file_14.js`, `file_25.js` | `mod_3`, `mod_14`, `mod_25` |
| `src/utils/` | `file_4.js`, `file_15.js`, `file_26.js`, `filler.js` | `mod_4`, `mod_15`, `mod_26` (+ filler artifact) |
| `src/middleware/` | `file_5.js`, `file_16.js`, `file_27.js` | `mod_5`, `mod_16`, `mod_27` |
| `src/config/` | `file_6.js`, `file_17.js` | `mod_6`, `mod_17` |
| `src/repositories/` | `file_7.js`, `file_18.js` | `mod_7`, `mod_18` |
| `src/domain/` | `file_8.js`, `file_19.js` | `mod_8`, `mod_19` |
| `tests/unit/` | `file_9.js`, `file_20.js` | `mod_9`, `mod_20` |
| `tests/integration/` | `file_10.js`, `file_21.js` | `mod_10`, `mod_21` |

### Function counts

- Each module file contains **1,200 functions** (`mod_N_0` … `mod_N_1199`).
- `src/middleware/file_27.js` (`mod_27`) is the single exception, with **705 functions**.
- `src/utils/filler.js` is a **padding artifact** — its header is `// filler 298001`, it declares **0 functions**, and it represents no module identity. *(Source: `src/utils/filler.js:L1`)*
- Totals: **`src/` = 28,305** functions, **`tests/` = 4,800** functions, for **33,105 functions total** across the 28 identities.

## Documentation

Complete project documentation lives under [`docs/`](docs/index.md):

- [Documentation hub](docs/index.md) — entry point and table of contents.
- [Project overview](docs/getting-started/overview.md) — an evidence-based description of what the project is.
- [Project structure](docs/getting-started/project-structure.md) — the layer taxonomy and the module-to-file map.
- [Architecture overview](docs/architecture/overview.md) — the layered architecture and structure diagram.
- [API reference](docs/api-reference/index.md) — the catalog of all 28 per-identity reference pages.
- [JSDoc conventions](docs/guides/jsdoc-conventions.md) — how JSDoc comments are applied to every function.

## Building the Documentation and PDF

The documentation is authored in Markdown and rendered into a single consolidated PDF. After installing the toolchain, one command builds everything:

```bash
npm install
npm run docs:build
```

`npm run docs:build` produces the consolidated deliverable at `docs/Society-Management-Documentation.pdf`. The build relies on a small set of dev-only tools: `jsdoc` and `jsdoc-to-markdown` generate the per-identity API tables, `@mermaid-js/mermaid-cli` renders diagrams to SVG, and `md-to-pdf` concatenates the ordered Markdown into the PDF. For the full step-by-step setup and the individual build steps, see [Building the documentation](docs/getting-started/building-docs.md).

## License

Licensed under the MIT License — see [`LICENSE/LICENSE.txt`](LICENSE/LICENSE.txt).
