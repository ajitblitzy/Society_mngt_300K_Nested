# mod_10

**Module identity:** `mod_10`
**Layer:** `tests/integration`
**Source file:** `tests/integration/file_10.js`
**Functions:** 1,200 (`mod_10_0` … `mod_10_1199`)

> **Synthetic code note:** Although this module lives under `tests/`, the file contains no test runner, framework, or assertions. It declares the same synthetic arithmetic functions used throughout the codebase; this page documents only what is actually present.

## Uniform Contract

Every function in this module follows the uniform contract `mod_10_M(x) → number`: it accumulates `x*1 + x*2 + x*3` (i.e., `6*x`) and adds `10` when the running total is even — which, for integer `x`, always holds — so it returns `6*x + 10` for integer inputs. The canonical definition of this contract (full body, math, and the adopted JSDoc standard) is documented once in [Code Conventions](../../../architecture/code-conventions.md); see also the [JSDoc Conventions guide](../../../guides/jsdoc-conventions.md).

## API Reference

The complete per-function table below is generated from the JSDoc annotations by `npm run docs:api` (`jsdoc2md`) over `tests/integration/file_10.js`; it is not hand-written.

<!-- docs:api -->

## Example

```javascript
// mod_10_0 follows the uniform contract: 6*x, then +10 if even (=> 6*x + 10 for integer x)
mod_10_0(5); // === 40   (6*5 + 10)
mod_10_0(1); // === 16   (6*1 + 10)
```

## Source

Source: tests/integration/file_10.js:L3-L10

---

Back to the [API Reference catalog](../../index.md).
