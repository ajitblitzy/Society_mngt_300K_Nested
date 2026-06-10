# Architecture Overview

The Society Management codebase is organized into an **11-layer directory taxonomy** — nine layers under `src/` and two under `tests/` — where each **layer** is simply a directory that groups one or more **module identity** files. Every file declares exactly one identity through its first-line header `// mod_N - society module`, and the code is **synthetic**: the society-management directory names are organizational labels only, with no application behavior behind them.

> **The code is synthetic.** Despite the society-management vocabulary of the directory names (`controllers`, `services`, `models`, …), the files contain **no business logic and no framework wiring** — there are no `import` / `export` or `module.exports` / `require` statements and no Express, Mongoose, or Sequelize usage anywhere. The layers are an **organizational** grouping only; this page describes the structure that is actually present and does **not** ascribe runtime behavior (such as "handling requests" or "mapping routes") to any layer or identity. The shared behavior of every function is the **uniform contract** defined once in [Code Conventions & Uniform Contract](./code-conventions.md), and the full identity scheme and per-file counts live in [Module Taxonomy](./module-taxonomy.md).

## Layered Taxonomy

The taxonomy separates application code (`src/`) from test code (`tests/`). Each layer below is a directory that **groups module identities**; a file is recognized as an identity solely by its first-line header `// mod_N - society module`. The descriptions are strictly organizational — they state which identities each layer groups and do **not** imply the runtime role their conventional names might suggest. *(Source: `src/controllers/file_0.js:L1`)*

**Nine layers under `src/`:**

- **`controllers/`** — groups module identities `mod_0`, `mod_11`, `mod_22`.
- **`services/`** — groups module identities `mod_1`, `mod_12`, `mod_23`.
- **`models/`** — groups module identities `mod_2`, `mod_13`, `mod_24`.
- **`routes/`** — groups module identities `mod_3`, `mod_14`, `mod_25`.
- **`utils/`** — groups module identities `mod_4`, `mod_15`, `mod_26`, and also holds the `filler.js` padding artifact, which carries no `// mod_N` header and is **not** a module identity.
- **`middleware/`** — groups module identities `mod_5`, `mod_16`, `mod_27` (`mod_27` is the single non-standard module — 705 functions; the exact per-file counts are in [Module Taxonomy](./module-taxonomy.md)).
- **`config/`** — groups module identities `mod_6`, `mod_17`; it holds no configuration data.
- **`repositories/`** — groups module identities `mod_7`, `mod_18`.
- **`domain/`** — groups module identities `mod_8`, `mod_19`.

**Two layers under `tests/`:**

- **`unit/`** — groups module identities `mod_9`, `mod_20`.
- **`integration/`** — groups module identities `mod_10`, `mod_21`.

Across all eleven layers there are **28 module identities** (`mod_0` … `mod_27`). The complete identity → layer → file mapping, the `mod_N_M` naming convention, and the per-file function counts are documented in [Module Taxonomy](./module-taxonomy.md) and are not duplicated here.

## No Inter-Layer Wiring

The layers are an organizational grouping **only** — there is no wiring between them, and no application is assembled from them. Concretely, and verified across every file:

- There are **no** `import` / `export` statements and **no** `module.exports` / `require()` calls anywhere in the codebase, so no file imports, exports, or calls into another.
- There is **no** framework usage of any kind — no Express, Mongoose, Sequelize, or similar dependency is referenced.
- Every function is a **file-scoped, non-exported global** declaration; the only other top-level statement in each module file is `const store = [];`, which is declared but never read or written by the functions.

As a result, each module identity is a self-contained set of independent `mod_N_M(x)` functions, and the layers do **not** reference one another. Readers should therefore not assume a wired, runnable application: there are no entry points, no request handling, and no inter-module calls. The behavior that every function shares — the **uniform contract** `mod_N_M(x) → number` — is described in [Code Conventions & Uniform Contract](./code-conventions.md). *(Source: `src/controllers/file_0.js:L1`)*

## Repository & Layer Structure

The diagram below shows the repository layout and the placement of module identities within each layer: the repository root holds the root documentation hub `README.md` and the `society_mgmt_300k.zip` archive, which extracts to the `src/` and `tests/` trees and the MIT `LICENSE`; `src/` contains the nine application layers and `tests/` contains the two test layers.

```mermaid
graph TD
    ROOT["Repository root"] --> RM["README.md (documentation hub)"]
    ROOT --> ZIP["society_mgmt_300k.zip"]
    ZIP --> SRC["src/"]
    ZIP --> TST["tests/"]
    ZIP --> LIC["LICENSE/LICENSE.txt (MIT)"]
    SRC --> C["controllers (mod_0, 11, 22)"]
    SRC --> S["services (mod_1, 12, 23)"]
    SRC --> M["models (mod_2, 13, 24)"]
    SRC --> R["routes (mod_3, 14, 25)"]
    SRC --> U["utils (mod_4, 15, 26 + filler)"]
    SRC --> MW["middleware (mod_5, 16, 27)"]
    SRC --> CF["config (mod_6, 17)"]
    SRC --> RP["repositories (mod_7, 18)"]
    SRC --> D["domain (mod_8, 19)"]
    TST --> UT["unit (mod_9, 20)"]
    TST --> IT["integration (mod_10, 21)"]
```

The documentation build renders this diagram to SVG via `npm run docs:diagrams` (the `mmdc` CLI from `@mermaid-js/mermaid-cli`), and the assembled PDF embeds the rendered image:

![Repository / layer structure](../assets/diagrams/structure.svg)

*Diagram source: the Mermaid fenced block on this page (`docs/architecture/overview.md`), rendered to `../assets/diagrams/structure.svg` by `npm run docs:diagrams`.* That rendered SVG is a **generated, committed** build output — `mmdc` produces it during `npm run docs:diagrams` and it is committed as a documentation deliverable, so the consolidated PDF embeds it and the Markdown link-check resolves against it; see [Documentation Assets](../assets/README.md) for the diagram source → SVG mapping.

## See Also

- [Module Taxonomy](./module-taxonomy.md) — the `mod_N` identity scheme, the `mod_N_M` naming convention, the full identity → layer → file mapping, and the per-file function counts.
- [Code Conventions & Uniform Contract](./code-conventions.md) — the canonical `mod_N_M(x) → number` uniform contract shared by every function, and the adopted JSDoc standard.
- [Project Structure](../getting-started/project-structure.md) — the same layer taxonomy and module map presented layer-first, including the on-disk directory tree.
- [API Reference Index](../api-reference/index.md) — the per-identity catalog linking all 28 reference pages, grouped by layer.
