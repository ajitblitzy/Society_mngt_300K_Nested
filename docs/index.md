# Society Management — Documentation

The **Society Management** codebase is a layered Node.js / JavaScript project organized into **28 self-contained module identities** (`mod_0` … `mod_27`) — exactly one per source file — spread across **11 architectural layers** under `src/` and `tests/`. This documentation set describes the project structure, explains the layered architecture and the `mod_N` identity scheme, and provides a per-identity API reference together with developer guides. The corpus is authored in Markdown and assembled into a single consolidated PDF deliverable, `Society-Management-Documentation.pdf`, built from this folder.

> **Note on synthetic code.** Although the directory names (`controllers`, `services`, `models`, `routes`, `repositories`, `domain`, …) imply a society-management application, the code is **synthetic**: every function is the *same* arithmetic routine, and there is **no business logic and no framework wiring** (no `module.exports` / `require`, and no Express, Mongoose, or Sequelize usage). This documentation therefore describes only what is actually present and does **not** attribute member-management, billing, payments, authentication, or any similar feature to the code. The exact uniform contract is detailed in [Code Conventions & Uniform Contract](architecture/code-conventions.md). *(Source: `src/controllers/file_0.js:L3-L10`)*

## Table of Contents

This page is the entry point for the entire documentation tree. Every section below is linked with a relative path that resolves both on a git host and inside the assembled PDF.

### Getting Started

- [Overview](getting-started/overview.md) — an evidence-based description of what the project is.
- [Project Structure](getting-started/project-structure.md) — the layer taxonomy and the full module-to-file map.
- [Building the Docs & PDF](getting-started/building-docs.md) — install the toolchain and run the documentation build.

### Architecture

- [Architecture Overview](architecture/overview.md) — the layered architecture and a repository structure diagram.
- [Module Taxonomy (`mod_N` scheme)](architecture/module-taxonomy.md) — the module-identity scheme and the `mod_N_M` function-naming convention.
- [Code Conventions & Uniform Contract](architecture/code-conventions.md) — the shared function contract and the adopted JSDoc standard.

### API Reference

- [API Reference Index (all 28 identities)](api-reference/index.md) — the catalog of every module identity, grouped by layer. The index links to each of the 28 per-identity reference pages.

### Guides

- [JSDoc Conventions](guides/jsdoc-conventions.md) — how JSDoc comments are applied uniformly to every function.
- [PDF Export](guides/pdf-export.md) — the Markdown → PDF pipeline and the build command.

## Layers at a Glance

The codebase spans 11 layers and 28 module identities. The table below is a quick orientation; the complete module-to-file map and per-identity details live in [Project Structure](getting-started/project-structure.md).

| Layer (directory) | Module identities | Functions per file |
| --- | --- | --- |
| `src/controllers/` | `mod_0`, `mod_11`, `mod_22` | 1,200 |
| `src/services/` | `mod_1`, `mod_12`, `mod_23` | 1,200 |
| `src/models/` | `mod_2`, `mod_13`, `mod_24` | 1,200 |
| `src/routes/` | `mod_3`, `mod_14`, `mod_25` | 1,200 |
| `src/utils/` | `mod_4`, `mod_15`, `mod_26` (+ `filler.js`) | 1,200 (`filler.js` = 0) |
| `src/middleware/` | `mod_5`, `mod_16`, `mod_27` | 1,200 (`mod_27` = 705) |
| `src/config/` | `mod_6`, `mod_17` | 1,200 |
| `src/repositories/` | `mod_7`, `mod_18` | 1,200 |
| `src/domain/` | `mod_8`, `mod_19` | 1,200 |
| `tests/unit/` | `mod_9`, `mod_20` | 1,200 |
| `tests/integration/` | `mod_10`, `mod_21` | 1,200 |

Across all identities there are **33,105 functions** in total — **28,305** under `src/` and **4,800** under `tests/`. Every module file holds 1,200 functions except `src/middleware/file_27.js` (`mod_27`), which holds 705. The `src/utils/filler.js` file is a padding artifact (its header is `// filler 298001`); it declares **0 functions** and represents no module identity. *(Source: `src/utils/filler.js:L1`)*

## Building the Consolidated PDF

The documentation is authored in Markdown and rendered into a single consolidated PDF. After installing the toolchain, one command builds everything:

```bash
npm install
npm run docs:build
```

`npm run docs:build` produces the consolidated deliverable `Society-Management-Documentation.pdf` in this folder (`docs/`). For the full step-by-step setup and a breakdown of the individual build stages, see [Building the Docs & PDF](getting-started/building-docs.md).

## License

Licensed under the MIT License (Copyright (c) 2026). The full license text ships inside the source archive `society_mgmt_300k.zip` at `LICENSE/LICENSE.txt`; per the documentation scope the archive is not repackaged, so the license is not extracted into the repository working tree.
