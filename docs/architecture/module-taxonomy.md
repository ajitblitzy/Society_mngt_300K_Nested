# Module Taxonomy — the mod_N Identity Scheme

Every source and test module file in the Society Management codebase declares exactly one **module identity** through its first-line header, and every function in that file is namespaced to that identity as `mod_N_M(x)`. This page documents that scheme end to end: the identity header, the `mod_N_M` naming convention, the complete identity → layer → file mapping, and the per-file ordinal ranges and function counts.

> **The code is synthetic.** Every function is the same arithmetic routine, and there is no business logic and no framework wiring — no `module.exports`/`require`, no `import`/`export`, and no Express, Mongoose, or Sequelize usage. This page describes only the structure that exists; it does not ascribe request handling, persistence, or any other runtime behavior to the modules. The shared function body is defined canonically in [Code Conventions](./code-conventions.md) and is not repeated here.

## Module Identity Header

Each module file declares its identity on **line 1** with a header comment of the form:

```javascript
// mod_N - society module
```

where `N` is the module identity number. There are 28 such identities, `mod_0` … `mod_27`, and each lives in exactly one file — the canonical example is `mod_0`, whose header is the first line of `src/controllers/file_0.js`. *(Source: `src/controllers/file_0.js:L1`.)*

Immediately below the header, on **line 2**, every module file declares a file-scoped array:

```javascript
const store = [];
```

This `store` array is **unused** by the synthetic functions — no function reads from or writes to it. It is part of the uniform file shape but carries no behavior. *(Source: `src/controllers/file_0.js:L2`.)*

## Function Naming (`mod_N_M`)

Within a module identity, every function is named `mod_N_M`, where:

- `N` is the **module identity number** — the same `N` as the file's header, and
- `M` is the **function ordinal** within that module, starting at `0`.

For example, `mod_5_42` is the function with ordinal `42` in module identity `mod_5`. Every function takes a single numeric argument and returns a number, giving the signature:

```
mod_N_M(x) → number
```

The function body is identical across all identities and ordinals. To keep a single source of truth, that body and the value it computes are defined canonically in [Code Conventions](./code-conventions.md); this page intentionally does not repeat the arithmetic. Throughout this documentation, the term **uniform contract** refers to that shared `mod_N_M(x) → number` signature and body.

## Identity → Layer → File Mapping

The 28 module identities are distributed across 11 layers (directories) under `src/` and `tests/`. Each identity maps to exactly one source file; the table below is grouped by layer for readability. Each row's header is confirmed at the first line of its source file (`Source: src/<layer>/file_N.js:L1`, and `tests/<group>/file_N.js:L1` for the test layers).

| Layer | Module Identity | Source File |
|-------|-----------------|-------------|
| controllers | mod_0 | `src/controllers/file_0.js` |
| controllers | mod_11 | `src/controllers/file_11.js` |
| controllers | mod_22 | `src/controllers/file_22.js` |
| services | mod_1 | `src/services/file_1.js` |
| services | mod_12 | `src/services/file_12.js` |
| services | mod_23 | `src/services/file_23.js` |
| models | mod_2 | `src/models/file_2.js` |
| models | mod_13 | `src/models/file_13.js` |
| models | mod_24 | `src/models/file_24.js` |
| routes | mod_3 | `src/routes/file_3.js` |
| routes | mod_14 | `src/routes/file_14.js` |
| routes | mod_25 | `src/routes/file_25.js` |
| utils | mod_4 | `src/utils/file_4.js` |
| utils | mod_15 | `src/utils/file_15.js` |
| utils | mod_26 | `src/utils/file_26.js` |
| middleware | mod_5 | `src/middleware/file_5.js` |
| middleware | mod_16 | `src/middleware/file_16.js` |
| middleware | mod_27 | `src/middleware/file_27.js` (705 functions) |
| config | mod_6 | `src/config/file_6.js` |
| config | mod_17 | `src/config/file_17.js` |
| repositories | mod_7 | `src/repositories/file_7.js` |
| repositories | mod_18 | `src/repositories/file_18.js` |
| domain | mod_8 | `src/domain/file_8.js` |
| domain | mod_19 | `src/domain/file_19.js` |
| tests/unit | mod_9 | `tests/unit/file_9.js` |
| tests/unit | mod_20 | `tests/unit/file_20.js` |
| tests/integration | mod_10 | `tests/integration/file_10.js` |
| tests/integration | mod_21 | `tests/integration/file_21.js` |

That is **28 identities** in total.

> **Note — `src/utils/filler.js` is not a module identity.** The `utils` layer also contains `src/utils/filler.js`, which is a **padding artifact** rather than a module. Its first line is `// filler 298001` — not a `// mod_N - society module` header — and it declares no `mod_N_M` functions, so it is excluded from the 28 identities. *(Source: `src/utils/filler.js:L1`.)*

## Ordinals & Counts

The function ordinal `M` runs contiguously from `0`. For every module identity except one, the ordinals run `mod_N_0` … `mod_N_1199`, giving **1,200 functions per file**. The single exception is `mod_27` (in `src/middleware/file_27.js`), whose ordinals run `mod_27_0` … `mod_27_704`, giving **705 functions**. *(Source: `src/middleware/file_27.js:L1`.)*

| Group | Files | Functions per file | Subtotal |
|-------|-------|--------------------|----------|
| Standard module identities | 27 | 1,200 | 32,400 |
| `mod_27` (middleware exception) | 1 | 705 | 705 |
| **All module identities** | **28** | — | **33,105** |
| `src/utils/filler.js` (padding artifact — not an identity) | 1 | 0 | 0 |

The same totals split by source tree as follows:

| Tree | Identities | Function count | Derivation |
|------|------------|----------------|------------|
| `src/` | 24 | 28,305 | 23 × 1,200 + 705 |
| `tests/` | 4 | 4,800 | 4 × 1,200 |
| **Total** | **28** | **33,105** | 28,305 + 4,800 |

`src/utils/filler.js` is explicitly **excluded** from every count above. It carries the header `// filler 298001`, contains only `// filler NNNNNN` comment lines (running up to `// filler 299999`), declares **0 functions**, and represents **no module identity**. *(Source: `src/utils/filler.js:L1`.)*

## Related Pages

- [Code Conventions](./code-conventions.md) — the canonical **uniform contract** (the shared `mod_N_M(x) → number` body) and the adopted JSDoc standard.
- [Architecture Overview](./overview.md) — the layered directory taxonomy and the repository structure diagram.
- [Project Structure](../getting-started/project-structure.md) — the same identity-to-file map, presented layer-first.
- [API Reference](../api-reference/index.md) — the per-identity catalog with the generated API tables.
