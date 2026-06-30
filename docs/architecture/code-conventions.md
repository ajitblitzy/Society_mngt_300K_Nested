# Code Conventions & Uniform Contract

This page is the **canonical** definition of the two conventions shared by the entire Society Management codebase: the **uniform contract** that every function implements, and the **adopted JSDoc standard** applied to every function. Other pages — the [project overview](../getting-started/overview.md), the [module taxonomy](./module-taxonomy.md), every per-identity page under the [API reference](../api-reference/index.md), and the [JSDoc conventions guide](../guides/jsdoc-conventions.md) — reference this page rather than re-explaining these conventions.

> **The code is synthetic.** Every function in the codebase is the *same* arithmetic routine. There is no business logic and no framework wiring — no `module.exports`/`require`, no `import`/`export`, and no Express, Mongoose, or Sequelize usage. This page describes only what the code actually does and does not ascribe member-management, billing, or any other behavior to the functions, because none exists.

## Uniform Function Contract

Every function across all module identities and layers shares one signature and one body. The signature is:

```
mod_N_M(x) → number
```

where `N` is the module identity number, `M` is the function ordinal within that identity, `x` is the single numeric input, and the return value is a single `number`. The body is identical for every function; the canonical instance is `mod_0_0`:

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

### What it computes

The three accumulation steps add `x*1`, `x*2`, and `x*3` to the running total `r`, which simplifies to:

```
x*1 + x*2 + x*3 = 6 * x
```

The function then adds `10` only when `r` is even. For any **integer** `x`, `6 * x` is always even, so the `if (r % 2 === 0)` branch always executes. The function therefore returns **`6 * x + 10` for integer inputs**.

> For a non-integer `x`, `6 * x` need not be even, so the `+ 10` is conditional in the general case. The codebase is integer-oriented, and the worked values below use integers.

### Worked values

| Input `x` | `6 * x` | Even? | Return value |
|-----------|---------|-------|--------------|
| `0`       | `0`     | yes   | `10`         |
| `1`       | `6`     | yes   | `16`         |
| `2`       | `12`    | yes   | `22`         |
| `5`       | `30`    | yes   | `40`         |

Equivalently: `mod_0_0(0) = 10`, `mod_0_0(1) = 16`, `mod_0_0(2) = 22`, and `mod_0_0(5) = 40`.

Each module file also declares `const store = [];` on line 2, immediately below the module-identity header (`// mod_N - society module`) on line 1. This array is **unused** by the synthetic functions — no function reads from or writes to it. See the [module taxonomy](./module-taxonomy.md) for the identity-header and file-shape details. *(Header: `Source: src/controllers/file_0.js:L1`; store: `Source: src/controllers/file_0.js:L2`.)*

Source: `src/controllers/file_0.js:L3-L10`

## Adopted JSDoc Standard

Per the project rule *"Add JSDoc comments to all functions,"* a JSDoc block is placed immediately above every function declaration. Because all functions share the uniform contract, the block is structurally identical everywhere; only the function name differs. The adopted block is:

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

The standard is defined by the following rules:

- A `/** ... */` block is placed **immediately above** each function declaration.
- The first line is a one-line human description of the synthetic computation.
- `@param {number} x - The numeric input value.` documents the single numeric parameter.
- `@returns {number} The accumulated result.` documents the numeric return.
- Because the functions are non-exported and file-scoped, JSDoc documents them as **global** functions; no `@module` or `@memberof` tag is required for the synthetic set.
- The block is **structurally identical** for every function, differing only by the function name.

These JSDoc blocks are the input that `jsdoc-to-markdown` (`jsdoc2md`) consumes to generate the per-identity tables in the [API reference](../api-reference/index.md). For the full rollout of this convention across every function — per-file counts, the coverage target, and how the rule is applied everywhere — see the [JSDoc conventions guide](../guides/jsdoc-conventions.md). This page defines the convention itself; the guide explains applying it everywhere.

## See Also

- [Module Taxonomy](./module-taxonomy.md) — the `mod_N` module-identity scheme and `mod_N_M` naming convention.
- [Architecture Overview](./overview.md) — the layered directory taxonomy.
- [JSDoc Conventions Guide](../guides/jsdoc-conventions.md) — how the JSDoc standard is rolled out across all functions (coverage and per-file counts).
- [API Reference](../api-reference/index.md) — the catalog of every module identity, with the generated API tables.
