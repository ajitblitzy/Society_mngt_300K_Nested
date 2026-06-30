# Project Structure

The Society Management codebase is organized into a **layered taxonomy**: a set of directories under `src/` and `tests/` in which every file is exactly one **module identity** (`mod_N`), declared by its first-line header `// mod_N - society module` (Source: src/controllers/file_0.js:L1). This page is the complete map of that structure — the eleven layers, the full module → file → identity table, and the per-file and total function counts — verified directly against the extracted contents of `society_mgmt_300k.zip`.

> **The code is synthetic.** The directory names follow a conventional society-management taxonomy, but the layers are **organizational only**: there is no business logic and no framework wiring (no `import`/`export`, no `require`/`module.exports`, and no Express, Mongoose, or Sequelize usage). Every function implements the same **uniform contract**, defined canonically in [Code Conventions](../architecture/code-conventions.md). This page describes only the structure that actually exists and does not ascribe any runtime behavior to the layers.

## Layer Taxonomy

The codebase is partitioned into **11 layers** — **9** under `src/` and **2** under `tests/`. Each layer is a directory that groups one or more **module identities**; a module identity is a single file whose first line declares it with the header `// mod_N - society module` (Source: src/controllers/file_0.js:L1), followed by `const store = [];` on line 2 and the file's function declarations from line 3 onward. The descriptions below are intentionally structural — they state which identities each layer groups and nothing more, because the code carries no framework behavior to describe.

**Source layers (`src/`):**

- **`controllers/`** — a layer of the taxonomy that groups module identities mod_0, mod_11, mod_22.
- **`services/`** — a layer of the taxonomy that groups module identities mod_1, mod_12, mod_23.
- **`models/`** — a layer of the taxonomy that groups module identities mod_2, mod_13, mod_24.
- **`routes/`** — a layer of the taxonomy that groups module identities mod_3, mod_14, mod_25.
- **`utils/`** — a layer of the taxonomy that groups module identities mod_4, mod_15, mod_26; it additionally contains `filler.js`, a padding artifact that declares no functions and is **not** a module identity (detailed in the function-count summary below).
- **`middleware/`** — a layer of the taxonomy that groups module identities mod_5, mod_16, mod_27.
- **`config/`** — a layer of the taxonomy that groups module identities mod_6, mod_17.
- **`repositories/`** — a layer of the taxonomy that groups module identities mod_7, mod_18.
- **`domain/`** — a layer of the taxonomy that groups module identities mod_8, mod_19.

**Test layers (`tests/`):**

- **`tests/unit/`** — a layer of the taxonomy that groups module identities mod_9, mod_20.
- **`tests/integration/`** — a layer of the taxonomy that groups module identities mod_10, mod_21.

Across all eleven layers there are **28 module identities** in total, `mod_0` … `mod_27`. For the rendered repository/layer **structure diagram** and the architectural discussion of why the layers carry no inter-layer wiring, see [Architecture Overview](../architecture/overview.md).

## Module → File → Identity Map

The table below maps every layer to its files and the module identity each file declares. All eleven layers and all 28 identities are listed; the `utils/` row additionally notes the `filler.js` padding artifact.

| Layer | Files | Identities |
|-------|-------|------------|
| `src/controllers/` | file_0.js, file_11.js, file_22.js | mod_0, mod_11, mod_22 |
| `src/services/` | file_1.js, file_12.js, file_23.js | mod_1, mod_12, mod_23 |
| `src/models/` | file_2.js, file_13.js, file_24.js | mod_2, mod_13, mod_24 |
| `src/routes/` | file_3.js, file_14.js, file_25.js | mod_3, mod_14, mod_25 |
| `src/utils/` | file_4.js, file_15.js, file_26.js (+ `filler.js`) | mod_4, mod_15, mod_26 (+ artifact) |
| `src/middleware/` | file_5.js, file_16.js, file_27.js | mod_5, mod_16, mod_27 |
| `src/config/` | file_6.js, file_17.js | mod_6, mod_17 |
| `src/repositories/` | file_7.js, file_18.js | mod_7, mod_18 |
| `src/domain/` | file_8.js, file_19.js | mod_8, mod_19 |
| `tests/unit/` | file_9.js, file_20.js | mod_9, mod_20 |
| `tests/integration/` | file_10.js, file_21.js | mod_10, mod_21 |

That is **28 module identities** total (`mod_0` … `mod_27`), one per file. For the per-identity API reference — one dedicated page for each of the 28 identities — see the [API Reference catalog](../api-reference/index.md).

## Function-Count Summary

Every module-identity file declares a sequence of functions named `mod_N_M(x)` (for module `N`, ordinal `M`). The counts below were verified by counting the function declarations in each file.

**Per-file counts:**

| File(s) | Functions |
|---------|-----------|
| Every module-identity file (default) | 1,200 (`mod_N_0` … `mod_N_1199`) |
| `src/middleware/file_27.js` (mod_27) | 705 |
| `src/utils/filler.js` (padding artifact) | 0 |

**Totals:**

| Scope | Functions |
|-------|-----------|
| `src/` | 28,305 |
| `tests/` | 4,800 |
| **Grand total** | **33,105** |

**Derivation.** Under `src/`, the `controllers`, `services`, `models`, `routes`, and `utils` layers each hold three module files at 1,200 functions (3 × 1,200 = 3,600 per layer → 18,000 across the five layers); `middleware` holds 1,200 + 1,200 + 705 = 3,105; and `config`, `repositories`, and `domain` each hold two module files at 1,200 functions (2 × 1,200 = 2,400 per layer → 7,200 across the three layers) — giving **28,305** functions under `src/`. Under `tests/`, the `unit` and `integration` layers each hold two module files at 1,200 functions (2 × 1,200 = 2,400 per layer → 4,800), giving **4,800** functions. The grand total is therefore **33,105** functions.

Every one of these functions implements the same **uniform contract** — a single numeric parameter `x` and a numeric return value (Source: src/controllers/file_0.js:L3-L15); the canonical description of that contract is defined in [Code Conventions](../architecture/code-conventions.md) and is not repeated here.

> **`src/utils/filler.js` is a padding artifact, not a module identity.** Its first line is `// filler 298001` (Source: src/utils/filler.js:L1) rather than a `// mod_N - society module` header, and it contains only `// filler NNNNNN` padding comment lines with **0** function declarations. It is therefore excluded from the count of 28 module identities and contributes no functions to the totals above.

## Related Pages

- [Architecture Overview](../architecture/overview.md) — the rendered repository/layer **structure diagram** and the explanation of the layered, no-inter-layer-wiring architecture.
- [API Reference](../api-reference/index.md) — the **per-identity catalog**, with one dedicated reference page for each of the 28 module identities.
- [Project Overview](./overview.md) — the evidence-based introduction to the project and its synthetic nature.
