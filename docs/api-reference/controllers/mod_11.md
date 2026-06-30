# mod_11

[← Back to API Reference catalog](../index.md)

Module identity **`mod_11`** is one of the 28 module identities that make up the synthetic Society Management codebase. This page is its dedicated API reference and is filed under the **controllers** layer.

## Overview

- **Module identity:** `mod_11`
- **Layer:** `controllers`
- **Source file:** `src/controllers/file_11.js`
- **Functions:** 1,200 (`mod_11_0` … `mod_11_1199`)

`mod_11` is one of three module identities in the `controllers` layer (alongside `mod_0` and `mod_22`) and, like every identity in the codebase, contains only the uniform arithmetic functions described below — there is no business logic.

> **Synthetic-code note:** Despite the `controllers` layer name, `mod_11` performs no request handling, routing, or framework wiring; every one of its functions is the same synthetic arithmetic routine.

## Uniform Contract

Every function in this module identity follows the same **uniform contract**, with the signature `mod_11_M(x) → number` (one numeric input `x`, one numeric return). It accumulates `x*1 + x*2 + x*3` (that is, `6 * x`) and adds `10` when the total is even, so for integer `x` the result is `6 * x + 10`.

The full body, worked values, and the adopted JSDoc standard are defined once in [Code Conventions & Uniform Contract](../../architecture/code-conventions.md); see also the [JSDoc conventions](../../guides/jsdoc-conventions.md) guide for how the doc-comments are applied.

## API Reference

The table below is generated from the JSDoc in `src/controllers/file_11.js` by `npm run docs:api` (`jsdoc2md`); its columns are function, parameter, and returns.

<!-- docs:api -->

## Example

```javascript
// Each function returns 6*x + 10 for integer x.
mod_11_0(5); // => 40   (6*5 + 10)
mod_11_0(1); // => 16   (6*1 + 10)
```

## Source Citation

Source: src/controllers/file_11.js:L3-L10
