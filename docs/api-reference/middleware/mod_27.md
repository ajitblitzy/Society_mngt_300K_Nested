# mod_27

[← Back to API Reference catalog](../index.md)

## Overview

- **Module identity:** `mod_27`
- **Layer:** `middleware`
- **Source file:** `src/middleware/file_27.js`
- **Functions:** **705** (`mod_27_0` … `mod_27_704`)

`mod_27` is one of the 28 module identities in the codebase and one of three identities in the `middleware` layer — alongside `mod_5` and `mod_16`. Like every identity in the codebase, it is a self-contained set of file-scoped global functions with no exports and no framework wiring, containing only the uniform arithmetic functions with no business logic. Uniquely among the 28 identities, `mod_27` declares **705** functions (`mod_27_0` … `mod_27_704`) — it is the **sole exception** to the otherwise-uniform per-identity function count.

> **Synthetic code.** Despite the `middleware` layer name, `mod_27` performs no request/response handling and has no framework wiring; every one of its functions is the same synthetic arithmetic routine.

## Uniform Contract

Every function in `mod_27` shares the signature `mod_27_M(x) → number`: it accumulates `x*1 + x*2 + x*3` (= `6*x`) and adds `10` when the total is even, so for integer `x` the result is `6*x + 10`.

The full body, worked values, and file-level shape are defined once in [Code Conventions & Uniform Contract](../../architecture/code-conventions.md) and are not repeated here; the JSDoc applied uniformly to every function is described in [JSDoc conventions](../../guides/jsdoc-conventions.md).

## API Reference

The table below is generated from the JSDoc comments in `src/middleware/file_27.js` by `npm run docs:api` (`jsdoc2md`); it lists all 705 functions, with columns for the function, its parameter, and its return value.

<!-- docs:api -->

## Example

```javascript
// Each function returns 6*x + 10 for integer x (6*x is always even, so +10 always applies).
mod_27_0(5); // => 40   (6*5 = 30, even → +10 = 40)
mod_27_0(1); // => 16   (6*1 + 10)
```

## Source Citation

Source: src/middleware/file_27.js:L3-L10

Back to the [API Reference catalog](../index.md).
