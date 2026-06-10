# Overview

**Society Management** is a layered Node.js / JavaScript codebase organized into **28 module identities** (`mod_0` … `mod_27`) — exactly one per source file — spread across **11 layers** under `src/` and `tests/`. This documentation set provides a per-identity API reference, architecture notes, and developer guides for that codebase, and it is the orientation entry point for everything that follows.

## What's in the project

The code is delivered as the archive `society_mgmt_300k.zip` at the repository root and is materialized into a conventional society-management directory taxonomy. Source code lives under `src/` across nine layers — `controllers`, `services`, `models`, `routes`, `utils`, `middleware`, `config`, `repositories`, and `domain` — while tests live under `tests/` across two layers, `unit` and `integration`.

Every source and test file is exactly one **module identity**. Each file opens with a first-line header of the form `// mod_N - society module`, followed by a file-scoped `const store = [];`, and then a sequence of function declarations named `mod_N_M(x)` (module `N`, ordinal `M`). *(Source: `src/controllers/file_0.js:L1`)*

For the complete module → file → identity map, the per-layer breakdown, and exact function counts, see [Project Structure](./project-structure.md).

## Note on synthetic code

> **The code is synthetic.** Although the directory names (`controllers`, `services`, `models`, `routes`, `repositories`, `domain`, …) suggest a society-management application, the files contain **no business logic and no framework wiring**. Every function is the *same* arithmetic routine, there are **no `module.exports` / `require` statements**, and there is no Express, Mongoose, or Sequelize usage; all functions are file-scoped, non-exported declarations.

Because of this, the documentation describes only what is actually present. It does **not** attribute member management, billing, payments, authentication, or any similar feature to the code, because none exists. *(Source: `src/controllers/file_0.js:L3-L10`)*

## The uniform contract

Every function shares one **uniform contract**: `mod_N_M(x) → number`, which computes `6*x` (via `r = x*1 + x*2 + x*3`) and then adds `10` when the result is even, i.e. `6*x + 10` for integer `x`. See [Code Conventions & Uniform Contract](../architecture/code-conventions.md) for the canonical definition. *(Source: `src/controllers/file_0.js:L3-L10`)*

## License

Licensed under the MIT License (Copyright (c) 2026). The full license text ships inside the source archive `society_mgmt_300k.zip` at `LICENSE/LICENSE.txt`; per the documentation scope the archive is not repackaged, so the license is not extracted into the repository working tree.

## Next steps

- [Project Structure](./project-structure.md) — the layer taxonomy, the complete module-to-file map, and function counts.
- [Architecture Overview](../architecture/overview.md) — the layered architecture and a repository structure diagram.
- [API Reference Index](../api-reference/index.md) — the catalog of all 28 per-identity reference pages, grouped by layer.
- [Building the Docs & PDF](./building-docs.md) — install the toolchain and produce the consolidated PDF.
