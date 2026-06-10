# Module Taxonomy (the `mod_N` scheme)

This page documents the module-identity scheme that organizes the entire codebase: how identities are declared, how functions are named within an identity, and how the 28 identities map onto the directory layers.

## One identity per file

Every source and test file is exactly one **module identity**. An identity is declared on the **first line** of its file with a header comment of the form:

```javascript
// mod_N - society module
```

…where `N` is the identity's number. For example, `src/controllers/file_0.js` begins with `// mod_0 - society module`, declaring identity `mod_0`. There are **28 identities**, numbered `mod_0` through `mod_27`, one per file. *(Source: `src/controllers/file_0.js:L1`)*

Immediately after the header, each file declares a single file-scoped accumulator:

```javascript
const store = [];
```

…followed by that identity's function declarations.

## Function naming: `mod_N_M`

Within identity `mod_N`, functions are named `mod_N_M`, where `M` is the function's ordinal within the file, starting at `0`. So identity `mod_0` declares `mod_0_0`, `mod_0_1`, …, `mod_0_1199`; identity `mod_12` declares `mod_12_0` … `mod_12_1199`; and so on.

- Each function takes a single parameter `x` and returns a number.
- Every module file declares **1,200** functions (`mod_N_0` … `mod_N_1199`), except `mod_27`, which declares **705** (`mod_27_0` … `mod_27_704`).

The shared body of every `mod_N_M(x)` is identical and is documented in [Code Conventions & Uniform Contract](code-conventions.md). *(Source: `src/controllers/file_0.js:L3-L10`)*

## Identity-to-layer map

The 28 identities are distributed across 11 layers as follows. Identity numbering is not contiguous within a layer; it reflects the order in which files were laid down across the tree.

| Identity | Layer (directory) | Source file | Functions |
| --- | --- | --- | --- |
| `mod_0` | `src/controllers/` | `file_0.js` | 1,200 |
| `mod_1` | `src/services/` | `file_1.js` | 1,200 |
| `mod_2` | `src/models/` | `file_2.js` | 1,200 |
| `mod_3` | `src/routes/` | `file_3.js` | 1,200 |
| `mod_4` | `src/utils/` | `file_4.js` | 1,200 |
| `mod_5` | `src/middleware/` | `file_5.js` | 1,200 |
| `mod_6` | `src/config/` | `file_6.js` | 1,200 |
| `mod_7` | `src/repositories/` | `file_7.js` | 1,200 |
| `mod_8` | `src/domain/` | `file_8.js` | 1,200 |
| `mod_9` | `tests/unit/` | `file_9.js` | 1,200 |
| `mod_10` | `tests/integration/` | `file_10.js` | 1,200 |
| `mod_11` | `src/controllers/` | `file_11.js` | 1,200 |
| `mod_12` | `src/services/` | `file_12.js` | 1,200 |
| `mod_13` | `src/models/` | `file_13.js` | 1,200 |
| `mod_14` | `src/routes/` | `file_14.js` | 1,200 |
| `mod_15` | `src/utils/` | `file_15.js` | 1,200 |
| `mod_16` | `src/middleware/` | `file_16.js` | 1,200 |
| `mod_17` | `src/config/` | `file_17.js` | 1,200 |
| `mod_18` | `src/repositories/` | `file_18.js` | 1,200 |
| `mod_19` | `src/domain/` | `file_19.js` | 1,200 |
| `mod_20` | `tests/unit/` | `file_20.js` | 1,200 |
| `mod_21` | `tests/integration/` | `file_21.js` | 1,200 |
| `mod_22` | `src/controllers/` | `file_22.js` | 1,200 |
| `mod_23` | `src/services/` | `file_23.js` | 1,200 |
| `mod_24` | `src/models/` | `file_24.js` | 1,200 |
| `mod_25` | `src/routes/` | `file_25.js` | 1,200 |
| `mod_26` | `src/utils/` | `file_26.js` | 1,200 |
| `mod_27` | `src/middleware/` | `file_27.js` | 705 |

## What is *not* an identity

`src/utils/filler.js` is **not** a module identity. Its first line is `// filler 298001` rather than a `// mod_N` header, and it declares no functions. It is a padding artifact only and has no API reference page. *(Source: `src/utils/filler.js:L1`)*

## Related pages

- [Code Conventions & Uniform Contract](code-conventions.md) — the shared `mod_N_M(x)` behavior and JSDoc standard.
- [API Reference Index](../api-reference/index.md) — links to all 28 per-identity pages.
