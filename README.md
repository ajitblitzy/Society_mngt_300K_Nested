# Society Management

A layered Node.js / JavaScript codebase organized into **28 module identities** (`mod_0` … `mod_27`), one per file, across an eleven-layer directory taxonomy.

## Overview

The repository groups its code under a conventional application taxonomy: **nine layers** under `src/` (`controllers`, `services`, `models`, `routes`, `utils`, `middleware`, `config`, `repositories`, `domain`) and **two test layers** under `tests/` (`unit`, `integration`) — eleven layers in total. Each file is a single **module identity**, declared on its first line by the header `// mod_N - society module` and containing functions named `mod_N_M(x)`, where `N` is the module number and `M` is the function ordinal. *(Source: `src/controllers/file_0.js:L1`.)*

Every function shares one **uniform contract**: it takes a single numeric argument `x`, accumulates `x*1 + x*2 + x*3`, adds `10` when the running total is even, and returns the resulting number. The layers above are an organizational scheme only — they group module identities by directory and carry no inter-layer wiring. *(Source: `src/controllers/file_0.js:L3-L10`.)*

> **The code is synthetic.** Despite the society-management directory names (`controllers`, `services`, `models`, …), the files contain **no business logic and no framework wiring**. Every function is the same arithmetic routine described above; there are no `require`/`module.exports`, no `import`/`export`, and no Express, Mongoose, or Sequelize usage anywhere. This README and the accompanying documentation describe only what is actually present and deliberately do **not** invent member-management, billing, or any other feature.

## Repository structure

Each layer is a directory that groups one or more module identities. The table below maps every layer to its files and the identities they declare.

| Layer | Directory | Files | Module identities | Functions per file |
|-------|-----------|-------|-------------------|--------------------|
| Controllers | `src/controllers/` | `file_0`, `file_11`, `file_22` | mod_0, mod_11, mod_22 | 1,200 each |
| Services | `src/services/` | `file_1`, `file_12`, `file_23` | mod_1, mod_12, mod_23 | 1,200 each |
| Models | `src/models/` | `file_2`, `file_13`, `file_24` | mod_2, mod_13, mod_24 | 1,200 each |
| Routes | `src/routes/` | `file_3`, `file_14`, `file_25` | mod_3, mod_14, mod_25 | 1,200 each |
| Utils | `src/utils/` | `file_4`, `file_15`, `file_26`, `filler.js` | mod_4, mod_15, mod_26 | 1,200 each (`filler.js`: 0) |
| Middleware | `src/middleware/` | `file_5`, `file_16`, `file_27` | mod_5, mod_16, mod_27 | 1,200 each (mod_27: 705) |
| Config | `src/config/` | `file_6`, `file_17` | mod_6, mod_17 | 1,200 each |
| Repositories | `src/repositories/` | `file_7`, `file_18` | mod_7, mod_18 | 1,200 each |
| Domain | `src/domain/` | `file_8`, `file_19` | mod_8, mod_19 | 1,200 each |
| Tests — unit | `tests/unit/` | `file_9`, `file_20` | mod_9, mod_20 | 1,200 each |
| Tests — integration | `tests/integration/` | `file_10`, `file_21` | mod_10, mod_21 | 1,200 each |

### Function-count summary

- Each module file declares **1,200 functions**, with one exception: `src/middleware/file_27.js` (identity `mod_27`) declares **705**.
- `src/utils/filler.js` is a **padding artifact** (header `// filler 298001`) that declares **0 functions** and is **not** a module identity. *(Source: `src/utils/filler.js:L1`.)*
- Totals: **`src/` = 28,305** functions, **`tests/` = 4,800** functions, **33,105** functions overall.

## Documentation

Comprehensive project documentation lives under [`docs/`](docs/index.md). Start at the hub and navigate by topic:

- [Documentation hub](docs/index.md) — table of contents and entry point.
- [Project overview](docs/getting-started/overview.md) — what the project is, described from the code.
- [Project structure](docs/getting-started/project-structure.md) — the layer taxonomy and the full module-to-file map.
- [Architecture overview](docs/architecture/overview.md) — the layered architecture and repository-structure diagram.
- [API reference](docs/api-reference/index.md) — a catalog with one dedicated reference page per module identity (all 28).
- [JSDoc conventions](docs/guides/jsdoc-conventions.md) — how JSDoc comments are applied uniformly across every function.

## Building the documentation and PDF

The full build instructions are in [Building the documentation & PDF](docs/getting-started/building-docs.md). In short, with **Node.js ≥ 22**:

```bash
npm install        # install the documentation toolchain
npm run docs:build # author-then-assemble: generate the consolidated PDF
```

`npm run docs:build` runs the API-table generation, Mermaid diagram rendering, and PDF assembly in order, producing the single consolidated deliverable at `docs/Society-Management-Documentation.pdf`. The toolchain is a small set of dev-dependencies — `jsdoc`, `jsdoc-to-markdown`, `@mermaid-js/mermaid-cli`, and `md-to-pdf` — declared in `package.json`.

## License

Licensed under the MIT License — see `LICENSE/LICENSE.txt`.
