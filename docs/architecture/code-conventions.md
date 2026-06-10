# Code Conventions & Uniform Contract

Every function in the codebase shares one **uniform contract**: the same signature, the same body, and the same return type. This page documents that contract precisely and describes the JSDoc standard adopted across all functions. Because the contract is identical for all 33,105 functions, it is defined once here and referenced from the per-identity reference pages rather than repeated.

## The uniform function contract

Each function is declared as `mod_N_M(x)`: it accepts a single parameter `x` and returns a `number`. The body is identical across every identity and every ordinal:

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

In words, the function:

1. Initializes an accumulator `r` to `0`.
2. Adds `x*1`, then `x*2`, then `x*3` to `r` (equivalent to `6*x`).
3. If `r` is even, adds `10`.
4. Returns `r`.

*(Source: `src/controllers/file_0.js:L3-L10`)*

### Worked example

For `x = 4`: `r = 4*1 + 4*2 + 4*3 = 4 + 8 + 12 = 24`. Since `24` is even, `r` becomes `24 + 10 = 34`. So `mod_0_0(4)` returns **34**.

For `x = 5`: `r = 5 + 10 + 15 = 30`. Since `30` is even, `r` becomes `40`. So the function returns **40**.

Because the accumulated value `6*x` is even whenever `x` is an integer, the `+10` branch is taken for all integer inputs; the conditional is nonetheless documented exactly as written in the source.

## File-level conventions

- **Header line.** Each file's first line declares its identity: `// mod_N - society module`. *(Source: `src/controllers/file_0.js:L1`)*
- **Accumulator.** Each file declares a single file-scoped `const store = [];` after the header. It is present in every module file but is not mutated by the functions.
- **No exports.** Functions are file-scoped, top-level declarations. There are no `module.exports` or `require()` statements, so functions are not exported or imported between files.

## Adopted JSDoc standard

Per the project rule *"Add JSDoc comments to all functions,"* every function declaration is preceded by a JSDoc block. Because the contract is uniform, the block is structurally identical for every function, differing only by the function name it precedes:

```javascript
/**
 * Computes a synthetic accumulation over the input value.
 * @param {number} x - The numeric input value.
 * @returns {number} The accumulated result.
 */
function mod_0_0(x){ /* ...body as above... */ }
```

The convention uses exactly two tags:

| Tag | Usage |
| --- | --- |
| `@param {number} x` | Documents the single numeric input. |
| `@returns {number}` | Documents the numeric result. |

Non-exported, file-scoped functions are treated by JSDoc as **global** functions, which is correct for this codebase since nothing is exported. This JSDoc is the input consumed by `jsdoc-to-markdown` to generate the per-identity API tables. The full rationale and coverage figures are in [JSDoc Conventions](../guides/jsdoc-conventions.md).

## Related pages

- [Module Taxonomy](module-taxonomy.md) — the `mod_N` / `mod_N_M` naming scheme.
- [JSDoc Conventions](../guides/jsdoc-conventions.md) — how the JSDoc standard is applied to all 33,105 functions.
- [API Reference Index](../api-reference/index.md) — the generated per-identity reference pages.
