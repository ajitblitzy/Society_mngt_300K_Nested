# Getting Started

After completing this guide, you will know how to extract the bundled archive `society_mgmt_300k.zip`, locate a single JavaScript function, and verify by hand that it returns `6x + 10` for any integer input `x`. The closed-form outcome holds for every non-filler `*.js` file in the archive — controllers, services, models, routes, middleware, config, repositories, domain, utils, unit tests, and integration tests alike — because every function in the project shares the same body. The implementation is **performance-neutral**: it contains no caching, no parallelism, no algorithmic optimisation, and no I/O to optimise; see [`performance-analysis.md`](performance-analysis.md) for the full evidence-based verdict.

## What This Project Is

The repository's root `README.md` declares the project as a "test project for backprop integration." All of the executable JavaScript code lives bundled inside `society_mgmt_300k.zip` rather than checked-in directly under a top-level `src/` folder, so the file paths cited throughout this documentation set refer to entries *inside* that archive. The archive packs 30 entries: 1 `LICENSE/LICENSE.txt` (MIT, 2026) plus 29 `*.js` files distributed across `src/` and `tests/` subfolders.

Despite the conventional Node.js folder names inside the archive — `src/controllers/`, `src/services/`, `src/models/`, `src/routes/`, `src/middleware/`, `src/config/`, `src/repositories/`, `src/domain/`, `src/utils/`, `tests/unit/`, and `tests/integration/` — every function in every non-filler file shares one identical body and returns `6x + 10` for any integer `x`. The folder names describe **where** functions live, not **what** they do. See [`architecture.md`](architecture.md) for the full folder taxonomy and [`api-reference.md`](api-reference.md) for the canonical universal function pattern.

## Repository Layout

The repository root contains exactly three first-order entries (excluding `.git/`):

- `README.md` — the repository identity (project name + one-sentence purpose).
- `society_mgmt_300k.zip` — the bundled JavaScript codebase (30 entries: 1 LICENSE + 29 `*.js` files).
- `docs/` — this documentation tree.

See [`architecture.md`](architecture.md) for the full folder taxonomy.

## Extracting the Archive

The archive must be extracted before the file paths cited throughout this documentation can be opened on disk. Run the following command from the repository root. The Python form is preferred because Python's standard library `zipfile` module is universally available on developer machines and introduces no new dependencies; the `unzip` form is provided as a one-line alternative for users who prefer it.

```bash
python3 -c "import zipfile; zipfile.ZipFile('society_mgmt_300k.zip').extractall('extracted/')"
# Alternative for users who prefer unzip:
# unzip society_mgmt_300k.zip -d extracted/
```

After running this command from the repository root, the source files appear under `extracted/src/...` and `extracted/tests/...`, and the license appears at `extracted/LICENSE/LICENSE.txt`. From that point onwards, every citation in this documentation of the form `Source: src/<folder>/<file>.js` resolves to `extracted/src/<folder>/<file>.js` on your local disk.

## Reading Your First File

After extracting, open `extracted/src/controllers/file_0.js` in any text editor. The file structure is uniform across the archive:

- Line 1 is a marker comment — `// mod_0 - society module` — used to identify the file index `N` in the `mod_N_M` naming scheme.
- Line 2 is `const store = [];`. This array is **declared but never read or written** by any function in the repository — it is dead code, not a memoisation cache. See [`performance-analysis.md`](performance-analysis.md) for why its presence does not constitute a performance enhancement.
- Lines 3 onwards declare 1,200 functions named `mod_0_0` through `mod_0_1199`, all sharing one identical body.

The first function — taken verbatim from lines 3–10 of `extracted/src/controllers/file_0.js` — is shown below. Every other function in the file (`mod_0_1` through `mod_0_1199`) has a byte-identical body, and the same body recurs in every other non-filler `*.js` file across the archive.

```javascript
function mod_0_0(x){
 let r=0;
 r+=x*1;
 r+=x*2;
 r+=x*3;
 if(r%2===0){r+=10}
 return r;
}
```

## Worked Example: mod_0_0(7) = 52

The walkthrough below evaluates `mod_0_0(7)` step by step, mirroring exactly what the JavaScript engine would do at runtime.

| Step | Expression | Value |
|------|------------|------:|
| start | `r = 0` | 0 |
| add `x*1` | `r += 1*7` | 7 |
| add `x*2` | `r += 2*7` | 21 |
| add `x*3` | `r += 3*7` | 42 |
| parity check | `42 % 2 === 0` | true |
| conditional | `r += 10` | 52 |
| return | `r` | **52** |

For any integer `x`, the same pattern simplifies to `r = 6x + 10`. See [`api-reference.md`](api-reference.md) for the algebraic proof and a table of additional worked examples covering negative, zero, small positive, mid-range, and large inputs.

## Where to Go Next

- [`architecture.md`](architecture.md) — see the full folder taxonomy and file layout
- [`api-reference.md`](api-reference.md) — the universal function pattern, naming scheme, and worked-example table
- [`performance-analysis.md`](performance-analysis.md) — explicit verdict on whether the code enhances performance
- [`modules/utils.md`](modules/utils.md) — sample module page (illustrates the shared module-page template, including the special `filler.js` callout)

## Source Citations

- `Source: README.md` — project identity statement (`# Ajit-backprop-test` + `test project for backprop integration.`)
- `Source: society_mgmt_300k.zip` — bundled archive containing all `*.js` files (30 entries: 1 LICENSE + 29 `*.js`)
- `Source: src/controllers/file_0.js` — canonical first-function example; lines 1–2 contain the marker comment and the unused `store` array; lines 3–10 contain the body of `mod_0_0(x)` shown verbatim above

---

[Back to docs index](README.md)
