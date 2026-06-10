# mod_26

`mod_26` is a **module identity** in the **utils** layer of the Society Management codebase.

| Property | Value |
|----------|-------|
| Identity | `mod_26` |
| Layer | `utils` |
| Source file | `src/utils/file_26.js` |
| Functions | 1,200 (`mod_26_0` … `mod_26_1199`) |

## Uniform Contract

Every function in this identity has the signature `mod_26_M(x) → number`. It accumulates `x*1 + x*2 + x*3` (= `6*x`) and adds `10` when the running total is even; for integer `x` the result is therefore `6*x + 10`.

All 28 module identities share this **uniform contract** — see the canonical definition in [Code Conventions & Uniform Contract](../../architecture/code-conventions.md). JSDoc is applied to every function per the project rule; see [JSDoc Conventions](../../guides/jsdoc-conventions.md).

## API Reference

The complete function table below is generated from the JSDoc in `src/utils/file_26.js` by `npm run docs:api` (`jsdoc-to-markdown`). It is not hand-maintained.

<!-- docs:api -->

## Example

```javascript
// mod_26_0 computes 6*x, then +10 because the result is even.
mod_26_0(5); // => 40   (6*5 + 10)
mod_26_0(1); // => 16   (6*1 + 10)
```

## Source

Source: src/utils/file_26.js:L3-L10

> Note: `src/utils/filler.js` in this layer is a non-identity padding artifact (0 functions) and has no reference page.

[← API Reference catalog](../index.md)
