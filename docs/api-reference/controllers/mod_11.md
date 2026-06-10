# mod_11

[← Back to API Reference catalog](../index.md)

## Overview

- **Module identity:** `mod_11`
- **Layer:** `controllers`
- **Source file:** `src/controllers/file_11.js`
- **Functions:** 1,200 (`mod_11_0` … `mod_11_1199`)

`mod_11` is one of three module identities in the `controllers` layer — alongside `mod_0` and `mod_22` — and, like every identity in the codebase, it contains only the uniform arithmetic functions, with no business logic.

> **Synthetic code.** Despite the `controllers` layer name, `mod_11` performs no request handling; every one of its functions is the same synthetic arithmetic routine.

## Uniform Contract

Every function in `mod_11` shares the signature `mod_11_M(x) → number`: it accumulates `x*1 + x*2 + x*3` (= `6*x`) and adds `10` when the total is even, so for integer `x` the result is `6*x + 10`.

The full body, worked values, and file-level shape are defined once in [Code Conventions & Uniform Contract](../../architecture/code-conventions.md) and are not repeated here; the JSDoc applied uniformly to every function is described in [JSDoc conventions](../../guides/jsdoc-conventions.md).

## API Reference

The table below is generated from the JSDoc comments in `src/controllers/file_11.js` by `npm run docs:api` (`jsdoc2md`); its columns are the function, its parameter, and its return value.

<!-- docs:api -->

## Example

```javascript
// Each function returns 6*x + 10 for integer x.
mod_11_0(5); // => 40   (6*5 + 10)
mod_11_0(1); // => 16   (6*1 + 10)
```

## Source Citation

Source: src/controllers/file_11.js:L3-L10
