# Architecture Overview

The Society Management codebase follows a **layered architecture** expressed through its directory taxonomy. Application code is grouped into nine layers under `src/`, and tests are grouped into two layers under `tests/`. Each directory holds one or more files, and each file is a single **module identity**.

## Layered structure

The repository is organized top-down from the root into the source and test trees, and then into per-layer directories. The diagram below shows the directory taxonomy and the module identities placed in each layer.

![Repository structure and module placement by layer](docs/assets/diagrams/repo-structure.svg)

*Diagram source: `docs/assets/diagrams-src/repo-structure.mmd` (rendered to SVG by `npm run docs:diagrams`).*

## The layers

The nine `src/` layers use names drawn from a conventional society-management / web-service taxonomy. **The names are organizational only** — as explained in [Overview](../getting-started/overview.md), the code is synthetic and contains no framework wiring, so these layers do not carry the runtime responsibilities their names might imply. They are described here strictly as code-organization units.

| Layer | Directory | Identities | Notes |
| --- | --- | --- | --- |
| Controllers | `src/controllers/` | `mod_0`, `mod_11`, `mod_22` | Organizational layer; uniform synthetic functions. |
| Services | `src/services/` | `mod_1`, `mod_12`, `mod_23` | Organizational layer; uniform synthetic functions. |
| Models | `src/models/` | `mod_2`, `mod_13`, `mod_24` | Organizational layer; uniform synthetic functions. |
| Routes | `src/routes/` | `mod_3`, `mod_14`, `mod_25` | Organizational layer; no routing is wired. |
| Utils | `src/utils/` | `mod_4`, `mod_15`, `mod_26` | Organizational layer; also holds the `filler.js` artifact. |
| Middleware | `src/middleware/` | `mod_5`, `mod_16`, `mod_27` | `mod_27` has 705 functions (the only non-1,200 module). |
| Config | `src/config/` | `mod_6`, `mod_17` | Organizational layer; holds no configuration data. |
| Repositories | `src/repositories/` | `mod_7`, `mod_18` | Organizational layer; no persistence is wired. |
| Domain | `src/domain/` | `mod_8`, `mod_19` | Organizational layer; uniform synthetic functions. |
| Unit tests | `tests/unit/` | `mod_9`, `mod_20` | Same uniform functions as `src/`. |
| Integration tests | `tests/integration/` | `mod_10`, `mod_21` | Same uniform functions as `src/`. |

## No framework wiring

There is no inter-module wiring in this codebase. Specifically:

- There are **no** `require()` calls and **no** `module.exports` — modules do not import one another.
- There is **no** Express, Mongoose, Sequelize, or any other framework dependency.
- Every function is a **file-scoped, non-exported** declaration; the file-level `const store = [];` is declared but not populated by the functions.

As a result, the "architecture" is purely a static organization of identical, independent functions into named directories. The behavior shared by every function is documented in [Code Conventions & Uniform Contract](code-conventions.md). *(Source: `src/controllers/file_0.js:L1-L10`)*

## Related pages

- [Module Taxonomy](module-taxonomy.md) — the `mod_N` identity scheme and `mod_N_M` naming.
- [Code Conventions & Uniform Contract](code-conventions.md) — the shared function behavior and JSDoc standard.
- [API Reference Index](../api-reference/index.md) — per-identity pages grouped by these layers.
