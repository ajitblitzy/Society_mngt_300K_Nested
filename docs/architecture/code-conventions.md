# Code Conventions & Uniform Contract

This page is the **canonical** definition of the two things the rest of the documentation set refers back to rather than re-explaining: the **uniform contract** shared by every function in the codebase, and the **adopted JSDoc standard** applied to every function. Other pages — including [Architecture Overview](./overview.md), [Module Taxonomy](./module-taxonomy.md), the per-identity pages under [API Reference](../api-reference/index.md), and [JSDoc Conventions](../guides/jsdoc-conventions.md) — defer to this page, so it is kept self-contained and precise.

> **The code is synthetic.** Every function is the *same* arithmetic routine; there is no business logic and no framework wiring (no `module.exports`/`require`, no `import`/`export`, no Express, Mongoose, or Sequelize). The sections below describe only what the source actually contains — no behavior, parameter, configuration, or feature is invented.

## Uniform Function Contract

Every function in the codebase shares one signature and one body. The signature is:

```
mod_N_M(x) → number
```

— one numeric input `x` and one numeric return value, for module identity `mod_N` and ordinal `M`. The body is **identical** across every module identity and every ordinal. Its canonical instance is `mod_0_0`:

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

*(Source: `src/controllers/file_0.js:L3-L10`)*

### What the body computes

The three additions accumulate `x*1 + x*2 + x*3`, which simplifies to `6*x`. The function then adds `10` whenever the running total `r` is even:

- For any **integer** `x`, `6*x` is **always even**, so the `if(r % 2 === 0)` branch **always** runs and adds `10`.
- Therefore, for integer inputs, the function returns **`6*x + 10`**.

*(For completeness: when `x` is not an integer, `6*x` need not be even, so the `+10` is conditional in the general case. The codebase is integer-oriented and every canonical example uses integers.)*

### Worked values

| Call | `6*x` | Even? | Result (`6*x + 10`) |
| --- | --- | --- | --- |
| `mod_0_0(0)` | `0` | yes | **`10`** |
| `mod_0_0(1)` | `6` | yes | **`16`** |
| `mod_0_0(2)` | `12` | yes | **`22`** |
| `mod_0_0(5)` | `30` | yes | **`40`** |

### File-level shape

Each module file opens with two fixed lines before its functions begin:

- **Line 1 — identity header.** `// mod_N - society module` declares the file's module identity. The identity scheme and `mod_N_M` naming are documented in [Module Taxonomy](./module-taxonomy.md). *(Source: `src/controllers/file_0.js:L1`)*
- **Line 2 — accumulator.** `const store = [];` is declared in every module file but is **unused** — no function reads or writes it. *(Source: `src/controllers/file_0.js:L2`)*

Because nothing is exported (there are no `module.exports` or `require()` statements), the functions are file-scoped, top-level declarations.

## Adopted JSDoc Standard

The project carries one mandatory rule — *"Add JSDoc comments to all functions."* Because every function shares the uniform contract above, the JSDoc block is **structurally identical** for every function and differs only by the function name it precedes. This is the exact block applied to every function:

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

The standard is defined by these rules:

- A `/** ... */` block is placed **immediately above** each function declaration.
- A one-line description states the synthetic computation.
- `@param {number} x - The numeric input value.` documents the single numeric parameter.
- `@returns {number} The accumulated result.` documents the numeric return.
- Because the functions are non-exported and file-scoped, JSDoc documents them as **global** functions; no `@module` or `@memberof` tag is required for the synthetic set.

These blocks are the input that `jsdoc-to-markdown` (`jsdoc2md`) consumes to generate the per-identity tables in the [API Reference](../api-reference/index.md). The full rollout across every function — per-file counts and the coverage target — is documented in [JSDoc Conventions](../guides/jsdoc-conventions.md) and is not repeated here.

## See also

- [Module Taxonomy](./module-taxonomy.md) — the `mod_N` identity scheme and `mod_N_M` naming convention.
- [Architecture Overview](./overview.md) — the layered directory taxonomy.
- [JSDoc Conventions](../guides/jsdoc-conventions.md) — how the JSDoc standard is rolled out across every function.
- [API Reference](../api-reference/index.md) — the generated per-identity reference pages.
