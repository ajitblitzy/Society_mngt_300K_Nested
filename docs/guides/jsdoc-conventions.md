# JSDoc Conventions

This guide defines the exact JSDoc convention that is applied uniformly to every function in the Society Management codebase, so that the project's documentation rule is satisfied consistently and the resulting comments can be machine-extracted into the [API Reference](../api-reference/index.md). The convention is defined once here and is structurally identical for every function, differing only by the function name it precedes.

> **The code is synthetic.** Despite the society-management layer names, every function is the same arithmetic routine, with no business logic and no framework wiring (no `module.exports` / `require`, no Express, Mongoose, or Sequelize). This guide documents only the JSDoc convention that is actually applied; it invents no behavior.

## The rule

The project carries one mandatory documentation rule (rule name *"rule- document code"*):

> "Add JSDoc comments to all functions."

This guide records how that rule is applied uniformly across the codebase: a single JSDoc block is placed immediately above every function declaration. Because every function shares the same [uniform contract](../architecture/code-conventions.md), the block is identical for every function, which keeps the rule simple to apply consistently and makes the generated API reference uniform.

## Scope of the rule (coverage)

A JSDoc block is added immediately above **every** function declaration across all **28 module identities** — the **24 module files** under `src/` and the **4 test files** under `tests/` — for a total of **33,105 functions** (`src/` = 28,305; `tests/` = 4,800).

Two count details are worth noting for completeness:

- Every module file and test file contains **1,200** functions (`mod_N_0` … `mod_N_1199`), with one exception: `src/middleware/file_27.js` (module identity `mod_27`) contains **705** functions. *(Source: `src/middleware/file_27.js:L1`)*
- `src/utils/filler.js` declares **0 functions** — it is a padding artifact whose first line is `// filler 298001`, not a `// mod_N` header — so it carries no module identity and needs no JSDoc. The rule is **vacuously satisfied** for it, and it is excluded from the 33,105 denominator. *(Source: `src/utils/filler.js:L1`)*

The coverage target is 100% — every one of the 33,105 functions receives a block:

| Scope | Module files | Functions | JSDoc target |
| --- | --- | --- | --- |
| `src/` | 24 | 28,305 | 100% |
| `tests/` | 4 | 4,800 | 100% |
| **Total (28 identities)** | **28** | **33,105** | **100%** |

## The canonical JSDoc block

The exact block placed above every function is reproduced verbatim below. It is structurally identical for all 33,105 functions; only the function it sits above differs.

```javascript
/**
 * Computes a synthetic accumulation over the input value.
 * @param {number} x - The numeric input value.
 * @returns {number} The accumulated result.
 */
```

### Applied to a real function

Applied immediately above a real function — here the canonical `mod_0_0` — the block and the (unchanged) function body look like this:

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

*(Source: `src/controllers/file_0.js:L3-L10`)*

## The conventions

The convention is defined by the following rules, applied identically to every function:

- **Placement.** The `/** … */` block is placed **immediately above** each `function mod_N_M(x){…}` declaration, with no blank line between the block and the `function` keyword.
- **`@param`.** `@param {number} x - The numeric input value.` documents the single numeric parameter `x`.
- **`@returns`.** `@returns {number} The accumulated result.` documents the numeric return value.
- **Summary line.** A one-line description — *"Computes a synthetic accumulation over the input value."* — precedes the tags and states the synthetic computation. No other tags (`@example`, `@throws`, `@deprecated`, `@module`, `@memberof`) are used, because the uniform contract neither throws nor varies.
- **Global functions.** Every function is a file-scoped, top-level declaration; nothing is exported (there is no `export` or `module.exports`). JSDoc therefore treats each as a **global function**, which is the correct and idiomatic treatment for this codebase. `jsdoc.json` sets `sourceType: "script"` so the parser interprets the files as scripts (not ES modules) and resolves these declarations as globals. *(Source: `src/controllers/file_0.js:L1-L2`)*
- **Uniformity.** Because every function shares the uniform contract, the block is **structurally identical** across all 33,105 functions — only the function name above the block differs.

## Comment-only guarantee

> **This is a comment-only change.** Applying the rule adds JSDoc blocks only. **No function body, name, parameter, or return value is modified** — the synthetic arithmetic is preserved exactly. Adding documentation comments keeps the rule within documentation boundaries and does not alter the behavior of any function.

## How the blocks feed the API reference

These JSDoc blocks are the **input to `jsdoc-to-markdown` (`jsdoc2md`)**. The `npm run docs:api` build step runs `jsdoc2md` over the source globs `src/**/*.js` and `tests/**/*.js` (configured by `jsdoc.json`, with `sourceType: "script"`) and renders each module identity's functions into the generated table on its per-identity reference page under `docs/api-reference/**/mod_*.md`. Keeping every JSDoc block uniform therefore keeps every generated API table uniform, so the rule **directly feeds** the [API Reference](../api-reference/index.md) rather than being a standalone task.

For the mechanics of running the build and producing the consolidated PDF, see [Building the Docs & PDF](../getting-started/building-docs.md) and [PDF Export](pdf-export.md).

## The uniform contract

Every documented function shares the same **uniform contract**: `mod_N_M(x) → number`, which computes `6*x` and then adds `10` when the result is even. That contract — its body, worked values, and file-level shape — is defined canonically in [Code Conventions & Uniform Contract](../architecture/code-conventions.md) and is deliberately not repeated here.

## See also

- [Code Conventions & Uniform Contract](../architecture/code-conventions.md) — the canonical definition of the uniform contract and the adopted JSDoc standard.
- [Building the Docs & PDF](../getting-started/building-docs.md) — installing the toolchain and running the build.
- [PDF Export](pdf-export.md) — the Markdown → PDF pipeline and assembly order.
- [API Reference Index](../api-reference/index.md) — the generated per-identity reference pages fed by these JSDoc blocks.
