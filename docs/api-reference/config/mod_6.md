# mod_6

Module identity **`mod_6`** is one of the 28 module identities that make up the Society Management codebase. This page is its dedicated API reference and is filed under the **config** layer.

- **Module identity:** `mod_6`
- **Layer:** `config`
- **Source file:** `src/config/file_6.js`
- **Functions:** **1,200** functions (`mod_6_0` … `mod_6_1199`)

This code is **synthetic**: this module identity belongs to the `config` layer by directory taxonomy only — it holds **no configuration data, settings, environment variables, or credentials**. A file-scoped `const store = [];` is declared but left unused, and every function in this module identity is the same arithmetic routine described by the uniform contract below.

## Uniform Contract

Every function in this module identity follows the same **uniform contract**:

- **Signature:** `mod_6_M(x) → number` — one numeric input `x`, one numeric return.
- **Behavior:** computes `6 * x` (that is, `x*1 + x*2 + x*3`), then adds `10` when the result is even. For integer `x` the result is therefore `6 * x + 10`.

See [Code Conventions & Uniform Contract](../../architecture/code-conventions.md) for the full contract and the adopted JSDoc standard, and the [JSDoc conventions](../../guides/jsdoc-conventions.md) guide for how the doc-comments are applied. This page links to those definitions rather than repeating them.

## API Reference

The table below lists every function (`function | param | returns`) and is generated from the JSDoc in `src/config/file_6.js` by `jsdoc-to-markdown` (`jsdoc2md`) during `npm run docs:api`; it is not hand-maintained.

<!-- docs:api -->

## Example

```javascript
// mod_6_0 applies the uniform contract: r = x*1 + x*2 + x*3 (= 6*x), then +10 if r is even.
// For integer x the result is 6*x + 10.
mod_6_0(5); // => 40   (6*5 + 10)
mod_6_0(1); // => 16   (6*1 + 10)
```

## Source

Source: src/config/file_6.js:L3-L10

---

[← API Reference catalog](../index.md)
