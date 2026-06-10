# Project Overview

The **Society Management** codebase is a layered Node.js / JavaScript project. It is organized into **28 self-contained module identities** (`mod_0` … `mod_27`) — exactly one per source file — distributed across **11 architectural layers** under `src/` and `tests/`. This page is an evidence-based description of what the project actually is, based on direct inspection of the source tree.

## What the project is

The codebase is delivered as the archive `society_mgmt_300k.zip` at the repository root and is extracted into a conventional society-management directory taxonomy. Source code lives under `src/` across nine layers — `controllers`, `services`, `models`, `routes`, `utils`, `middleware`, `config`, `repositories`, and `domain` — while tests live under `tests/` across two layers, `unit` and `integration`.

Every source and test file represents exactly one **module identity**. Each file opens with a first-line header of the form `// mod_N - society module`, followed by a file-scoped `const store = [];`, and then a sequence of function declarations named `mod_N_M(x)` (module `N`, ordinal `M`). There are 28 identities in total. *(Source: `src/controllers/file_0.js:L1-L2`)*

## Important: this is a synthetic codebase

> **Note — the code is synthetic.** Although the directory names (`controllers`, `services`, `models`, `routes`, `repositories`, `domain`, …) suggest a society-management application, the files contain **no business logic and no framework wiring**. Every function performs the *same* synthetic arithmetic: it accumulates `x*1 + x*2 + x*3`, adds `10` when the running total is even, and returns the resulting number. There are no `module.exports` / `require` statements and no Express, Mongoose, or Sequelize usage; all functions are file-scoped, non-exported declarations.

Because of this, the documentation describes only what is actually present. It does **not** attribute member management, billing, payments, authentication, or any similar feature to the code, since none exists. The exact shared behavior is detailed in [Code Conventions & Uniform Contract](../architecture/code-conventions.md). *(Source: `src/controllers/file_0.js:L3-L10`)*

## The numbers at a glance

| Dimension | Value |
| --- | --- |
| Module identities | 28 (`mod_0` … `mod_27`) |
| Architectural layers | 11 (9 under `src/`, 2 under `tests/`) |
| Functions per module file | 1,200 (`mod_27` is the sole exception at 705) |
| Total functions | 33,105 (`src/` = 28,305; `tests/` = 4,800) |
| Padding artifact | `src/utils/filler.js` — 0 functions, no module identity |

Across all identities there are **33,105 functions**. Every module file holds 1,200 functions except `src/middleware/file_27.js` (`mod_27`), which holds 705. The `src/utils/filler.js` file is a padding artifact (its header is `// filler 298001`); it declares **0 functions** and represents no module identity. *(Source: `src/utils/filler.js:L1`)*

## Where to go next

- [Project Structure](project-structure.md) — the layer taxonomy and the complete module-to-file map.
- [Building the Docs & PDF](building-docs.md) — install the toolchain and run the documentation build.
- [Architecture Overview](../architecture/overview.md) — the layered architecture and a repository structure diagram.
- [Module Taxonomy](../architecture/module-taxonomy.md) — the `mod_N` identity scheme and the `mod_N_M` naming convention.
- [API Reference Index](../api-reference/index.md) — the catalog of all 28 per-identity reference pages, grouped by layer.

## License

Licensed under the MIT License — see [`../../LICENSE/LICENSE.txt`](../../LICENSE/LICENSE.txt).
