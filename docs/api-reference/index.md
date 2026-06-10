# API Reference

This is the catalog of all **28 module identities**, grouped by layer. Each identity has a dedicated reference page containing a generated table of its functions. The per-identity pages are produced by `npm run docs:api` (which runs `jsdoc-to-markdown` over the source JSDoc); see [Building the Docs & PDF](../getting-started/building-docs.md).

## Identities grouped by layer

The diagram below groups every identity under its layer, across the `src/` application tree and the `tests/` tree.

![Module identities grouped by layer](docs/assets/diagrams/module-grouping.svg)

*Diagram source: `docs/assets/diagrams-src/module-grouping.mmd` (rendered to SVG by `npm run docs:diagrams`).*

## Catalog

Every page shares the same shape: a title, the owning layer and source file, and a `## Functions` table listing each function with its parameters, return type, and description. All functions share the [uniform contract](../architecture/code-conventions.md).

### Controllers (`src/controllers/`)

- [`mod_0`](controllers/mod_0.md) — `src/controllers/file_0.js` (1,200 functions)
- [`mod_11`](controllers/mod_11.md) — `src/controllers/file_11.js` (1,200 functions)
- [`mod_22`](controllers/mod_22.md) — `src/controllers/file_22.js` (1,200 functions)

### Services (`src/services/`)

- [`mod_1`](services/mod_1.md) — `src/services/file_1.js` (1,200 functions)
- [`mod_12`](services/mod_12.md) — `src/services/file_12.js` (1,200 functions)
- [`mod_23`](services/mod_23.md) — `src/services/file_23.js` (1,200 functions)

### Models (`src/models/`)

- [`mod_2`](models/mod_2.md) — `src/models/file_2.js` (1,200 functions)
- [`mod_13`](models/mod_13.md) — `src/models/file_13.js` (1,200 functions)
- [`mod_24`](models/mod_24.md) — `src/models/file_24.js` (1,200 functions)

### Routes (`src/routes/`)

- [`mod_3`](routes/mod_3.md) — `src/routes/file_3.js` (1,200 functions)
- [`mod_14`](routes/mod_14.md) — `src/routes/file_14.js` (1,200 functions)
- [`mod_25`](routes/mod_25.md) — `src/routes/file_25.js` (1,200 functions)

### Utils (`src/utils/`)

- [`mod_4`](utils/mod_4.md) — `src/utils/file_4.js` (1,200 functions)
- [`mod_15`](utils/mod_15.md) — `src/utils/file_15.js` (1,200 functions)
- [`mod_26`](utils/mod_26.md) — `src/utils/file_26.js` (1,200 functions)

> `src/utils/filler.js` is a padding artifact with no module identity and no page (see [Project Structure](../getting-started/project-structure.md)).

### Middleware (`src/middleware/`)

- [`mod_5`](middleware/mod_5.md) — `src/middleware/file_5.js` (1,200 functions)
- [`mod_16`](middleware/mod_16.md) — `src/middleware/file_16.js` (1,200 functions)
- [`mod_27`](middleware/mod_27.md) — `src/middleware/file_27.js` (705 functions)

### Config (`src/config/`)

- [`mod_6`](config/mod_6.md) — `src/config/file_6.js` (1,200 functions)
- [`mod_17`](config/mod_17.md) — `src/config/file_17.js` (1,200 functions)

### Repositories (`src/repositories/`)

- [`mod_7`](repositories/mod_7.md) — `src/repositories/file_7.js` (1,200 functions)
- [`mod_18`](repositories/mod_18.md) — `src/repositories/file_18.js` (1,200 functions)

### Domain (`src/domain/`)

- [`mod_8`](domain/mod_8.md) — `src/domain/file_8.js` (1,200 functions)
- [`mod_19`](domain/mod_19.md) — `src/domain/file_19.js` (1,200 functions)

### Unit tests (`tests/unit/`)

- [`mod_9`](tests/unit/mod_9.md) — `tests/unit/file_9.js` (1,200 functions)
- [`mod_20`](tests/unit/mod_20.md) — `tests/unit/file_20.js` (1,200 functions)

### Integration tests (`tests/integration/`)

- [`mod_10`](tests/integration/mod_10.md) — `tests/integration/file_10.js` (1,200 functions)
- [`mod_21`](tests/integration/mod_21.md) — `tests/integration/file_21.js` (1,200 functions)

## Coverage

All **28** identities are documented, covering **33,105** functions in total (`src/` = 28,305; `tests/` = 4,800). Each function carries a JSDoc block (see [JSDoc Conventions](../guides/jsdoc-conventions.md)), and every identity's functions are listed on its page.
