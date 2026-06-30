# Society Management — Documentation

The Society Management project is a layered Node.js / JavaScript codebase organized into **28 module identities** (`mod_0` … `mod_27`), exactly one per file, distributed across **11 architectural layers** under `src/` and `tests/`. This documentation set describes the project precisely as it exists in the code: a dedicated per-identity API reference for every module, architecture and taxonomy notes, and developer guides for building the docs and producing the consolidated PDF. Start here and use the table of contents below to navigate by topic or by layer.

> **Note on synthetic code.** The directory names (`controllers`, `services`, `models`, `routes`, `repositories`, `domain`, and so on) suggest a society-management domain, but the code is **synthetic**: it contains no business logic and no framework wiring. Every function is the same small arithmetic routine over a single numeric input `x`, and there are no member-management, billing, payment, or authentication features anywhere in the codebase. This documentation therefore describes only the real, uniform structure that is actually present; the exact function contract is detailed in [Code Conventions & Uniform Contract](architecture/code-conventions.md). _Source: `src/controllers/file_0.js:L3-L15`._

## Table of Contents

### Getting Started

- [Overview](getting-started/overview.md) — what the project is, described strictly from the code.
- [Project Structure](getting-started/project-structure.md) — the layer taxonomy and the full module-to-file-to-identity map.
- [Building the Docs & PDF](getting-started/building-docs.md) — install the toolchain and run the documentation build.

### Architecture

- [Architecture Overview](architecture/overview.md) — the layered taxonomy and the repository-structure diagram.
- [Module Taxonomy (mod_N scheme)](architecture/module-taxonomy.md) — the `mod_N` identity scheme and the `mod_N_M` function-naming convention.
- [Code Conventions & Uniform Contract](architecture/code-conventions.md) — the shared function contract and the adopted JSDoc standard.

### API Reference

- [API Reference Index (all 28 identities)](api-reference/index.md) — a catalog with one dedicated reference page per module identity, grouped by layer. The index links to each of the 28 per-identity pages.

### Guides

- [JSDoc Conventions](guides/jsdoc-conventions.md) — how JSDoc comments are applied uniformly across every function.
- [PDF Export](guides/pdf-export.md) — how the ordered Markdown is concatenated into the single consolidated PDF.

## Quick Orientation — Layers & Identities

Each layer below contains one file per module identity. Every module file declares 1,200 functions, except `src/middleware/file_27.js` (705) and `src/utils/filler.js` (0 — a padding artifact, not a module identity). The complete detail lives in [Project Structure](getting-started/project-structure.md).

| Layer (directory) | Module Identities |
|-------------------|-------------------|
| `src/controllers/` | mod_0, mod_11, mod_22 |
| `src/services/` | mod_1, mod_12, mod_23 |
| `src/models/` | mod_2, mod_13, mod_24 |
| `src/routes/` | mod_3, mod_14, mod_25 |
| `src/utils/` | mod_4, mod_15, mod_26 (+ `filler.js`) |
| `src/middleware/` | mod_5, mod_16, mod_27 (705 functions) |
| `src/config/` | mod_6, mod_17 |
| `src/repositories/` | mod_7, mod_18 |
| `src/domain/` | mod_8, mod_19 |
| `tests/unit/` | mod_9, mod_20 |
| `tests/integration/` | mod_10, mod_21 |

**Totals:** 28 module identities across 11 layers, comprising **33,105 functions** in all (`src/` = 28,305; `tests/` = 4,800).

## Building the Consolidated PDF

Run `npm install` once to fetch the documentation toolchain, then `npm run docs:build` to generate `Society-Management-Documentation.pdf` in this folder. The full prerequisites and the individual build steps are described in [Building the Docs & PDF](getting-started/building-docs.md).

## License

Licensed under the MIT License — see `../LICENSE/LICENSE.txt`.
