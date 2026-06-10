# Project Structure

The Society Management codebase is organized into a **layered taxonomy** in which every source and test file is exactly one **module identity** (`mod_N`), declared by the file's first-line header `// mod_N - society module`. This page provides the complete, evidence-based map of that structure: the eleven layers, the full module-to-file-to-identity table, and the exact function counts. Every fact below was verified by direct inspection of the extracted `src/` and `tests/` trees.

## Directory taxonomy

The repository separates application code (`src/`) from test code (`tests/`). Within `src/` there are nine layers; within `tests/` there are two — eleven layers in total. Each layer is a directory that holds one or more files, and each file declares a single module identity. The diagram below shows the on-disk layout and the identities placed in each layer.

```text
society-management/
├── README.md                 project overview + documentation hub link
├── society_mgmt_300k.zip      source archive (extracted to src/ and tests/; holds the MIT LICENSE)
├── package.json               documentation toolchain + build scripts
├── jsdoc.json                 JSDoc / jsdoc2md source configuration
├── pdf.config.json            consolidated-PDF assembly configuration
├── scripts/                   documentation build helpers (docs-api, docs-diagrams, docs-pdf)
├── docs/                      authored Markdown documentation (this page lives here)
├── src/                       application code — nine layers
│   ├── controllers/           mod_0,  mod_11, mod_22
│   ├── services/              mod_1,  mod_12, mod_23
│   ├── models/                mod_2,  mod_13, mod_24
│   ├── routes/                mod_3,  mod_14, mod_25
│   ├── utils/                 mod_4,  mod_15, mod_26  (+ filler.js artifact)
│   ├── middleware/            mod_5,  mod_16, mod_27
│   ├── config/                mod_6,  mod_17
│   ├── repositories/          mod_7,  mod_18
│   └── domain/                mod_8,  mod_19
└── tests/                     test code — two layers
    ├── unit/                  mod_9,  mod_20
    └── integration/           mod_10, mod_21
```

## The eleven layers

The eleven layers are purely **organizational units** of the directory taxonomy. Their names are drawn from a conventional society-management / web-service vocabulary, but — because the code is synthetic and has no framework wiring — they do **not** carry the runtime responsibilities those names might imply; each layer simply groups one or more module identities. Each file's first line declares its identity using the header convention `// mod_N - society module`. *(Source: `src/controllers/file_0.js:L1`)*

Nine layers under `src/`:

- `controllers/` — a layer of the taxonomy containing module identities `mod_0`, `mod_11`, `mod_22`.
- `services/` — a layer of the taxonomy containing module identities `mod_1`, `mod_12`, `mod_23`.
- `models/` — a layer of the taxonomy containing module identities `mod_2`, `mod_13`, `mod_24`.
- `routes/` — a layer of the taxonomy containing module identities `mod_3`, `mod_14`, `mod_25`.
- `utils/` — a layer of the taxonomy containing module identities `mod_4`, `mod_15`, `mod_26` (also holds the `filler.js` artifact, which is not a module identity).
- `middleware/` — a layer of the taxonomy containing module identities `mod_5`, `mod_16`, `mod_27`.
- `config/` — a layer of the taxonomy containing module identities `mod_6`, `mod_17`.
- `repositories/` — a layer of the taxonomy containing module identities `mod_7`, `mod_18`.
- `domain/` — a layer of the taxonomy containing module identities `mod_8`, `mod_19`.

Two layers under `tests/`:

- `unit/` — a layer of the taxonomy containing module identities `mod_9`, `mod_20`.
- `integration/` — a layer of the taxonomy containing module identities `mod_10`, `mod_21`.

## Module-to-file map

Every file maps to exactly one module identity. The table below lists each of the eleven layers, the files it contains, the identities those files declare, and the number of functions in each file. All twenty-eight identities (`mod_0` … `mod_27`) are accounted for here.

| Layer (directory) | Files | Module identities | Functions per file |
| --- | --- | --- | --- |
| `src/controllers/` | `file_0.js`, `file_11.js`, `file_22.js` | `mod_0`, `mod_11`, `mod_22` | 1,200 |
| `src/services/` | `file_1.js`, `file_12.js`, `file_23.js` | `mod_1`, `mod_12`, `mod_23` | 1,200 |
| `src/models/` | `file_2.js`, `file_13.js`, `file_24.js` | `mod_2`, `mod_13`, `mod_24` | 1,200 |
| `src/routes/` | `file_3.js`, `file_14.js`, `file_25.js` | `mod_3`, `mod_14`, `mod_25` | 1,200 |
| `src/utils/` | `file_4.js`, `file_15.js`, `file_26.js`, `filler.js` | `mod_4`, `mod_15`, `mod_26` (+ filler artifact) | 1,200 (`filler.js` = 0) |
| `src/middleware/` | `file_5.js`, `file_16.js`, `file_27.js` | `mod_5`, `mod_16`, `mod_27` | 1,200 (`mod_27` = 705) |
| `src/config/` | `file_6.js`, `file_17.js` | `mod_6`, `mod_17` | 1,200 |
| `src/repositories/` | `file_7.js`, `file_18.js` | `mod_7`, `mod_18` | 1,200 |
| `src/domain/` | `file_8.js`, `file_19.js` | `mod_8`, `mod_19` | 1,200 |
| `tests/unit/` | `file_9.js`, `file_20.js` | `mod_9`, `mod_20` | 1,200 |
| `tests/integration/` | `file_10.js`, `file_21.js` | `mod_10`, `mod_21` | 1,200 |

## Function-count summary

Function counts are regular across the codebase, with two documented exceptions:

| Scope | Functions |
| --- | --- |
| Each module file (default) | 1,200 (`mod_N_0` … `mod_N_1199`) |
| `src/middleware/file_27.js` (`mod_27`) | 705 (the only non-1,200 module) |
| `src/utils/filler.js` | 0 (padding artifact — not a module identity) |
| **`src/` total** | **28,305** |
| **`tests/` total** | **4,800** |
| **Grand total** | **33,105** |

Every function shares one **uniform contract** — `mod_N_M(x) → number` — whose canonical definition lives in [Code Conventions & Uniform Contract](../architecture/code-conventions.md); it is referenced here rather than duplicated. *(Source: `src/controllers/file_0.js:L3-L10`)*

The `src/` total is derived as follows: the five three-file layers `controllers`, `services`, `models`, `routes`, and `utils` contribute 3 × 1,200 = 3,600 functions each (18,000 in total); `middleware` contributes 1,200 + 1,200 + 705 = 3,105; and the three two-file layers `config`, `repositories`, and `domain` contribute 2 × 1,200 = 2,400 each (7,200 in total) — giving 18,000 + 3,105 + 7,200 = **28,305**. The `tests/` total is `unit` (2 × 1,200) + `integration` (2 × 1,200) = **4,800**, for a grand total of **33,105** functions across the 28 identities.

## The `filler.js` artifact

`src/utils/filler.js` is deliberately excluded from the module-identity scheme. Unlike every other file, it does **not** begin with a `// mod_N - society module` header — its first line is `// filler 298001`, and the remainder of the file is composed solely of `// filler NNNNNN` padding comment lines. Because it declares **0 functions**, it contributes nothing to the function totals above and has no per-identity reference page. It is documented here only so that its presence in `src/utils/` is not mistaken for a twenty-ninth identity. *(Source: `src/utils/filler.js:L1`)*

## Related pages

- [Overview](./overview.md) — an evidence-based description of what the project is, including the note on its synthetic nature.
- [Architecture Overview](../architecture/overview.md) — how the layers relate, with the rendered repository / layer **structure diagram**.
- [Module Taxonomy](../architecture/module-taxonomy.md) — the `mod_N` identity scheme and the `mod_N_M` naming convention in detail.
- [Code Conventions & Uniform Contract](../architecture/code-conventions.md) — the canonical description of the shared function behavior and the adopted JSDoc standard.
- [API Reference Index](../api-reference/index.md) — the **per-identity catalog** of all 28 reference pages, grouped by layer.
