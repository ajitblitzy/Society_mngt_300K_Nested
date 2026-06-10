# JSDoc Conventions

This guide records the exact JSDoc convention applied across the codebase and how it is applied uniformly to every function. It exists so the convention is defined once and stays consistent across all 33,105 blocks.

## The rule

The project carries one explicit documentation rule:

> **Add JSDoc comments to all functions.**

This rule is satisfied by adding a JSDoc block immediately above **every** function declaration in every function-bearing file — the 28 module files under `src/**` and the 4 test files under `tests/**`. No function body, name, parameter, or return value is changed; only documentation comments are added.

## The adopted block

Because every function shares the same [uniform contract](../architecture/code-conventions.md), the JSDoc block is structurally identical for every function and differs only by the function it precedes:

```javascript
/**
 * Computes a synthetic accumulation over the input value.
 * @param {number} x - The numeric input value.
 * @returns {number} The accumulated result.
 */
function mod_0_0(x){ /* ...unchanged body... */ }
```

### Tags used

| Tag | Meaning |
| --- | --- |
| `@param {number} x` | The single numeric input parameter. |
| `@returns {number}` | The numeric result returned by the function. |

A one-line summary sentence precedes the tags. No other tags (`@example`, `@throws`, `@deprecated`, etc.) are used, because the uniform contract neither throws nor varies.

## Global (non-exported) functions

Every function is a file-scoped, top-level declaration; nothing is exported. JSDoc treats such functions as **global**. The convention above documents them as global functions, which is the correct and idiomatic treatment for this codebase. *(Source: `src/controllers/file_0.js:L1-L10`)*

## Coverage

| Scope | Functions | JSDoc target |
| --- | --- | --- |
| `src/**` (28 module files) | 28,305 | 100% |
| `tests/**` (4 files) | 4,800 | 100% |
| **Total** | **33,105** | **100%** |

`src/utils/filler.js` declares **0 functions**, so its JSDoc requirement is vacuously satisfied; it is excluded from the denominator. *(Source: `src/utils/filler.js:L1`)*

## How JSDoc feeds the docs

These JSDoc blocks are the input to `jsdoc-to-markdown`. The `docs:api` build step runs `jsdoc2md` over `src/**/*.js` and `tests/**/*.js` and renders each module's functions into the table on its [per-identity reference page](../api-reference/index.md). Keeping the JSDoc uniform therefore keeps every generated API table uniform. See [Building the Docs & PDF](../getting-started/building-docs.md) for the build commands.
