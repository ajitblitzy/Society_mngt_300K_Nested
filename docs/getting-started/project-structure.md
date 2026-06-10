# Project Structure

This page describes the layered directory taxonomy of the Society Management codebase and provides the complete module-to-file map. The structure was derived by direct inspection of the extracted `src/` and `tests/` trees.

## Directory taxonomy

The repository separates application code (`src/`) from tests (`tests/`). Within `src/`, nine conventional layers are present; within `tests/`, two layers are present.

```text
society-management/
├── README.md                     project overview + documentation hub link
├── society_mgmt_300k.zip         source archive (extracted to src/ and tests/)
├── LICENSE/LICENSE.txt           MIT license
├── package.json                  documentation toolchain + build scripts
├── jsdoc.json                    JSDoc / jsdoc2md source configuration
├── pdf.config.json               consolidated-PDF assembly configuration
├── scripts/                      cross-platform build helpers (docs-api/diagrams/pdf)
├── src/
│   ├── controllers/              mod_0,  mod_11, mod_22
│   ├── services/                 mod_1,  mod_12, mod_23
│   ├── models/                   mod_2,  mod_13, mod_24
│   ├── routes/                   mod_3,  mod_14, mod_25
│   ├── utils/                    mod_4,  mod_15, mod_26  (+ filler.js artifact)
│   ├── middleware/               mod_5,  mod_16, mod_27
│   ├── config/                   mod_6,  mod_17
│   ├── repositories/             mod_7,  mod_18
│   └── domain/                   mod_8,  mod_19
└── tests/
    ├── unit/                     mod_9,  mod_20
    └── integration/              mod_10, mod_21
```

## Module-to-file map

Every file maps to exactly one module identity. The table below lists each layer, the files it contains, the identities those files declare, and the number of functions in each file.

| Layer (directory) | Files | Module identities | Functions per file |
| --- | --- | --- | --- |
| `src/controllers/` | `file_0.js`, `file_11.js`, `file_22.js` | `mod_0`, `mod_11`, `mod_22` | 1,200 |
| `src/services/` | `file_1.js`, `file_12.js`, `file_23.js` | `mod_1`, `mod_12`, `mod_23` | 1,200 |
| `src/models/` | `file_2.js`, `file_13.js`, `file_24.js` | `mod_2`, `mod_13`, `mod_24` | 1,200 |
| `src/routes/` | `file_3.js`, `file_14.js`, `file_25.js` | `mod_3`, `mod_14`, `mod_25` | 1,200 |
| `src/utils/` | `file_4.js`, `file_15.js`, `file_26.js`, `filler.js` | `mod_4`, `mod_15`, `mod_26` (+ filler) | 1,200 (`filler.js` = 0) |
| `src/middleware/` | `file_5.js`, `file_16.js`, `file_27.js` | `mod_5`, `mod_16`, `mod_27` | 1,200 (`mod_27` = 705) |
| `src/config/` | `file_6.js`, `file_17.js` | `mod_6`, `mod_17` | 1,200 |
| `src/repositories/` | `file_7.js`, `file_18.js` | `mod_7`, `mod_18` | 1,200 |
| `src/domain/` | `file_8.js`, `file_19.js` | `mod_8`, `mod_19` | 1,200 |
| `tests/unit/` | `file_9.js`, `file_20.js` | `mod_9`, `mod_20` | 1,200 |
| `tests/integration/` | `file_10.js`, `file_21.js` | `mod_10`, `mod_21` | 1,200 |

## Function-count summary

- Each module file contains **1,200 functions** (`mod_N_0` … `mod_N_1199`).
- `src/middleware/file_27.js` (`mod_27`) is the single exception, with **705 functions**.
- `src/utils/filler.js` is a **padding artifact** — its header is `// filler 298001`, it declares **0 functions**, and it represents no module identity. *(Source: `src/utils/filler.js:L1`)*
- Totals: **`src/` = 28,305** functions, **`tests/` = 4,800** functions, for **33,105 functions total** across the 28 identities.

## The `filler.js` artifact

`src/utils/filler.js` is intentionally excluded from the module-identity scheme. Unlike every other file, it does not begin with a `// mod_N - society module` header; its first line is `// filler 298001`, and the remainder of the file is padding. Because it declares no functions, it contributes nothing to the function totals and has no API reference page. It is documented here solely so its presence in `src/utils/` is not mistaken for a 29th identity. *(Source: `src/utils/filler.js:L1`)*

## Related pages

- [Architecture Overview](../architecture/overview.md) — how the layers relate, with a repository structure diagram.
- [Module Taxonomy](../architecture/module-taxonomy.md) — the `mod_N` identity scheme in detail.
- [API Reference Index](../api-reference/index.md) — per-identity reference pages grouped by layer.
