# Overview

Society Management is a layered **Node.js / JavaScript** codebase organized into **28 module identities** (`mod_0` … `mod_27`) — exactly one per file — spread across **11 layers** under `src/` and `tests/`. This documentation set provides a per-identity API reference, architecture notes, and developer guides for working with that codebase.

Each file declares its identity on its first line with the header `// mod_N - society module`, and every function inside it is named `mod_N_M(x)`, where `N` is the module identity number and `M` is the function ordinal. *(Source: src/controllers/file_0.js:L1.)*

## What's in the project

The codebase is partitioned into **11 layers** — a directory-based **layered taxonomy** in which every file is a single **module identity**:

- **Source layers (`src/`)** — `controllers`, `services`, `models`, `routes`, `utils`, `middleware`, `config`, `repositories`, and `domain` (nine layers).
- **Test layers (`tests/`)** — `unit` and `integration` (two layers).

The layers are an organizational scheme only; they group module identities by directory and carry no inter-layer wiring. For the complete module → file → identity map and the per-file and total function counts, see [Project Structure](./project-structure.md).

## Note on synthetic code

> **The code is synthetic.** The directory names follow a conventional society-management taxonomy (`controllers`, `services`, `models`, `routes`, `repositories`, `domain`, …), but the code carries **no business logic and no framework wiring**: every function is the **same arithmetic routine**, and there are no `import`/`export`, no `require`/`module.exports`, and no Express, Mongoose, or Sequelize statements anywhere. This documentation describes only what is actually present and deliberately does **not** invent member-management, billing, authentication, or any other feature that does not exist. *(Source: src/controllers/file_0.js:L3-L10.)*

## Uniform contract

Every function shares one **uniform contract**: `mod_N_M(x) → number`, which computes `6 * x` (via `x*1 + x*2 + x*3`) and adds `10` when the result is even — that is, `6 * x + 10` for integer `x`. *(Source: src/controllers/file_0.js:L3-L10.)* See [Code Conventions & Uniform Contract](../architecture/code-conventions.md) for the canonical definition.

## License

Licensed under the MIT License (Copyright (c) 2026) — see [`../../LICENSE/LICENSE.txt`](../../LICENSE/LICENSE.txt).

## Next steps

- [Project Structure](./project-structure.md) — the layer taxonomy, the full module map, and function counts.
- [Architecture Overview](../architecture/overview.md) — the layered architecture and the repository-structure diagram.
- [API Reference](../api-reference/index.md) — the catalog with one dedicated reference page per module identity (all 28).
- [Building the documentation & PDF](./building-docs.md) — install the toolchain and build the docs and the consolidated PDF.
