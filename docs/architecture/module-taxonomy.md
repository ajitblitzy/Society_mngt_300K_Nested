# Module Taxonomy — the `mod_N` Identity Scheme

Every source and test file in the Society Management codebase is exactly one **module identity**, declared by the file's first-line header `// mod_N - society module`, and every function it contains is namespaced `mod_N_M(x)` — module identity `N`, ordinal `M`. This page documents that scheme end to end: how an identity is declared, how its functions are named, the complete identity → layer → file mapping, and the exact ordinal ranges and function counts.

> **The code is synthetic.** The directory names (`controllers`, `services`, `models`, …) follow a conventional society-management vocabulary, but the files contain **no business logic and no framework wiring** — there are no `module.exports` / `require` statements and no Express, Mongoose, or Sequelize usage. The taxonomy below describes only the structure that is actually present; it does not ascribe runtime behavior (such as "handling requests") to any layer or identity. The shared behavior of every function is defined once in [Code Conventions & Uniform Contract](./code-conventions.md) and is not repeated here.

## Module Identity Header

Each module file opens with two fixed lines before any function is declared:

- **Line 1 — identity header.** The comment `// mod_N - society module` declares the file's single **module identity**, where `N` is the identity number. For example, `src/controllers/file_0.js` begins with `// mod_0 - society module`, declaring identity `mod_0`. There are **28 identities**, `mod_0` through `mod_27`, one per file. *(Source: `src/controllers/file_0.js:L1`)*
- **Line 2 — accumulator.** `const store = [];` is a file-scoped array declared in every module file. It is **unused** — no function in the file reads from or writes to it. *(Source: `src/controllers/file_0.js:L2`)*

```javascript
// mod_0 - society module
const store = [];
```

A file is recognized as a module identity solely by the `// mod_N - society module` header on its first line; a file without that header (see `filler.js` below) is **not** an identity.

## Function Naming (`mod_N_M`)

Within identity `mod_N`, every function is named `mod_N_M`, where:

- **`N`** is the **module identity number** taken from the file's header (the same `N` for every function in the file), and
- **`M`** is the **function ordinal** within that module, starting at `0` and increasing by one for each subsequent declaration.

So identity `mod_0` declares `mod_0_0`, `mod_0_1`, …; identity `mod_12` declares `mod_12_0`, `mod_12_1`, …; and so on. Every function shares the same signature:

```
mod_N_M(x) → number
```

— a single numeric parameter `x` and a single numeric return value. The shared body and its computation (the **uniform contract**) are identical across all identities and ordinals; they are documented canonically in [Code Conventions & Uniform Contract](./code-conventions.md) and are intentionally not duplicated here.

## Identity → Layer → File Mapping

The 28 module identities are distributed across the eleven **layers** of the directory taxonomy — nine under `src/` and two under `tests/`. The table below is grouped by layer; every cell was verified by reading each file's first-line header.

| Layer | Module Identity | Source File |
|-------|-----------------|-------------|
| controllers | `mod_0` | `src/controllers/file_0.js` |
| controllers | `mod_11` | `src/controllers/file_11.js` |
| controllers | `mod_22` | `src/controllers/file_22.js` |
| services | `mod_1` | `src/services/file_1.js` |
| services | `mod_12` | `src/services/file_12.js` |
| services | `mod_23` | `src/services/file_23.js` |
| models | `mod_2` | `src/models/file_2.js` |
| models | `mod_13` | `src/models/file_13.js` |
| models | `mod_24` | `src/models/file_24.js` |
| routes | `mod_3` | `src/routes/file_3.js` |
| routes | `mod_14` | `src/routes/file_14.js` |
| routes | `mod_25` | `src/routes/file_25.js` |
| utils | `mod_4` | `src/utils/file_4.js` |
| utils | `mod_15` | `src/utils/file_15.js` |
| utils | `mod_26` | `src/utils/file_26.js` |
| middleware | `mod_5` | `src/middleware/file_5.js` |
| middleware | `mod_16` | `src/middleware/file_16.js` |
| middleware | `mod_27` | `src/middleware/file_27.js` (705 functions) |
| config | `mod_6` | `src/config/file_6.js` |
| config | `mod_17` | `src/config/file_17.js` |
| repositories | `mod_7` | `src/repositories/file_7.js` |
| repositories | `mod_18` | `src/repositories/file_18.js` |
| domain | `mod_8` | `src/domain/file_8.js` |
| domain | `mod_19` | `src/domain/file_19.js` |
| tests/unit | `mod_9` | `tests/unit/file_9.js` |
| tests/unit | `mod_20` | `tests/unit/file_20.js` |
| tests/integration | `mod_10` | `tests/integration/file_10.js` |
| tests/integration | `mod_21` | `tests/integration/file_21.js` |

That is **28 identities** in total. *(Source: `src/controllers/file_0.js:L1`)*

> **Not an identity:** `src/utils/filler.js` also lives under the `utils` layer but is **not** a module identity. It carries no `// mod_N` header (its first line is `// filler 298001`) and declares no functions, so it is excluded from the table above and from every count below. It is described as a padding artifact in the next section. *(Source: `src/utils/filler.js:L1`)*

## Ordinals & Counts

The function ordinal `M` runs contiguously from `0` within each module identity:

- **Standard module files:** ordinals run `mod_N_0` … `mod_N_1199`, i.e. **1,200 functions** per file.
- **Exception — `mod_27`:** the identity in `src/middleware/file_27.js` runs `mod_27_0` … `mod_27_704`, i.e. **705 functions**. *(Source: `src/middleware/file_27.js:L1`)*
- **Padding artifact — `filler.js`:** `src/utils/filler.js` declares **0 functions**; its first line is `// filler 298001` and the remainder is composed solely of `// filler NNNNNN` comment lines (up to `// filler 299999`). It is **not** a module identity and is excluded from the identity and function counts. *(Source: `src/utils/filler.js:L1`)*

The counts roll up by location as follows:

| Location | Module files | Functions | Derivation |
|----------|--------------|-----------|------------|
| `src/` | 24 | **28,305** | 23 files × 1,200 + `mod_27` (705) = 27,600 + 705 |
| `tests/` | 4 | **4,800** | 4 files × 1,200 |
| **Total** | **28** | **33,105** | 28,305 + 4,800 |

So across the **28 module identities** there are **33,105 functions** in total — **28,305** under `src/` and **4,800** under `tests/`. The `filler.js` padding artifact contributes none of these.

## Related pages

- [Code Conventions & Uniform Contract](./code-conventions.md) — the canonical `mod_N_M(x) → number` body and the adopted JSDoc standard (the **uniform contract** this page refers to).
- [Architecture Overview](./overview.md) — the layered directory taxonomy with the rendered repository / layer structure diagram.
- [Project Structure](../getting-started/project-structure.md) — the same module map presented layer-first (the layer taxonomy view of the identities documented here).
- [API Reference Index](../api-reference/index.md) — the per-identity catalog linking all 28 reference pages.
