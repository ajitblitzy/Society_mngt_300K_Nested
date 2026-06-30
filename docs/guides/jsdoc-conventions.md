# JSDoc Conventions

> "Add JSDoc comments to all functions."

The line above is the mandatory project rule (rule name **"rule- document code"**), quoted verbatim. This guide defines the exact JSDoc convention that is applied uniformly to every function in the Society Management codebase, so that the rule is satisfied consistently and the resulting doc-comments can be machine-extracted into the generated API reference.

## Scope of the Rule

A JSDoc block is added immediately above **every** function declaration across all function-bearing files in the codebase. These files are the **28 module files** that correspond to the module identities `mod_0` … `mod_27`: 24 live under `src/**` (across the source layers) and **4 test files** live under `tests/**`. Together they contain **33,105 functions** (`src/` = 28,305; `tests/` = 4,800). A repository-wide search confirmed that no JSDoc blocks existed before this effort, so coverage starts from a clean slate and targets 100%.

Two counts are worth noting for completeness:

- Every module file contains **1,200** functions, with a single exception: `src/middleware/file_27.js` (module identity `mod_27`) contains **705**. Source: src/middleware/file_27.js
- `src/utils/filler.js` declares **0 functions**. It is a padding artifact whose first line is `// filler 298001`, not a module identity, so it needs no JSDoc — the rule is **vacuously satisfied** for it, and it is excluded from the 33,105 denominator. Source: src/utils/filler.js:L1

The coverage target is summarized below:

| Scope | Functions |
|-------|-----------|
| `src/**` | 28,305 |
| `tests/**` | 4,800 |
| **Total** | **33,105** |

## The Canonical JSDoc Block

Because every function shares the same **uniform contract**, the JSDoc block is **structurally identical** everywhere; only the function name beneath it changes. The canonical block is:

```javascript
/**
 * Computes a synthetic accumulation over the input value.
 * @param {number} x - The numeric input value.
 * @returns {number} The accumulated result.
 */
```

Applied above a real function — here `mod_0_0`, the first function of module identity `mod_0` — it reads:

```javascript
/**
 * Computes a synthetic accumulation over the input value.
 * @param {number} x - The numeric input value.
 * @returns {number} The accumulated result.
 */
function mod_0_0(x){
 let r=0;
 r+=x*1;
 r+=x*2;
 r+=x*3;
 if(r%2===0){r+=10}
 return r;
}
```

Source: src/controllers/file_0.js:L3-L15

## Applying the Convention

The convention is defined by the following rules, applied identically to all 33,105 blocks:

- The block is placed **immediately above** each `function mod_N_M(x){…}` declaration, with no blank line between the block and the function.
- The first line is a one-line summary describing the synthetic computation.
- `@param {number} x - The numeric input value.` documents the single numeric parameter `x`.
- `@returns {number} The accumulated result.` documents the numeric return value.
- Because the code uses file-scoped function declarations with no `export` or `module.exports`, JSDoc documents each one as a **global function** — the standard JSDoc behavior for non-exported functions. `jsdoc.json` sets `sourceType: "script"` to guarantee this parsing. Source: src/controllers/file_0.js:L1-L2
- The block is **structurally identical** for every function across every layer; only the function name beneath it differs.

## Comment-Only Guarantee

> **This is a comment-only change.** No function body, name, parameter, or return value is modified — the synthetic arithmetic is preserved exactly. Adding JSDoc keeps the rule strictly within documentation boundaries.

## How the Blocks Feed the API Reference

These JSDoc blocks are the **input to `jsdoc-to-markdown` (`jsdoc2md`)**. The `npm run docs:api` script invokes `jsdoc2md` with the `jsdoc.json` configuration (source globs `src/**/*.js` and `tests/**/*.js`, `sourceType: "script"`) and writes the per-identity API reference tables into each page under `docs/api-reference/**/mod_*.md`, replacing the content between that page's `<!-- docs:api:START -->` and `<!-- docs:api:END -->` markers (the script fails loudly if a page or its markers are missing). Applying the rule therefore **directly feeds** the generated API reference rather than being a standalone task — the more uniformly the blocks are authored, the more consistent the generated tables.

For how to run the documentation build, see [Building the documentation](../getting-started/building-docs.md); for the full build-to-PDF pipeline, see [PDF export](pdf-export.md).

## The Uniform Contract

Every documented function shares one **uniform contract**: `mod_N_M(x) → number`, which computes `6 * x` and then adds `10` when the result is even. The full definition of this contract — its arithmetic, worked values, and the `mod_N` / `mod_N_M` naming scheme — is given once in the canonical [Code Conventions & Uniform Contract](../architecture/code-conventions.md) page and is not repeated here.
