# Ajit-backprop-test
test project for backprop integration.

## Module Surface

All behavioural logic in this repository lives in a single canonical primitive at `src/utils/mod_compute.js`, which exports one function — `modCompute(x)` — that returns `6 * x + 10`. This is the sole source of truth for the numerical contract observed by every named export across the source tree.

Every `src/<folder>/file_<N>.js` file is a thin façade that re-exports its 1,200 named symbols (`mod_<N>_0` … `mod_<N>_1199`) all bound to the same `modCompute` reference. The only exception is `src/middleware/file_27.js`, which exposes 705 named symbols (`mod_27_0` … `mod_27_704`). Calling any façade export is therefore equivalent to calling `modCompute` directly.

```js
const { modCompute } = require('./src/utils/mod_compute');
console.log(modCompute(7)); // 52
```

```js
const facade = require('./src/controllers/file_0');
console.log(facade.mod_0_0(7)); // 52
```

## Testing

The project uses the Node.js built-in `node:test` runner together with `node:assert/strict`; no third-party dependencies are introduced. Running `npm test` executes every assertion under `tests/` and verifies that every refactored façade returns the same numerical result (`6 * x + 10`) as the canonical `modCompute` for a sampled grid of inputs.

```bash
npm test
```

Requires Node.js >= 18.0.0 (Node 22.x recommended).

## Refactor Notes

The codebase was refactored to remediate a set of defects discovered during a full source scan. The tautological conditional `if (r % 2 === 0) r += 10` — which was always true because `r = x*1 + x*2 + x*3 = 6*x` is always even — was replaced with the branch-free closed form `return 6 * x + 10`. The unused module-level state `const store = []` was removed from every file, and the previously-missing `module.exports` declarations were added so every façade now publishes its symbols and the codebase is reachable from consumers and tests. The 33,105 byte-identical function bodies were centralised into the single `modCompute` primitive, and `src/utils/filler.js` (1,999 lines of `// filler NNNNN` comments with no executable code) was deleted. The placeholder skeletons under `tests/unit/` and `tests/integration/` were replaced with real `node:test` assertions that lock the numerical contract.

All public symbol names (`mod_<N>_<K>`) are preserved at their original module paths so that any consumer that resolves these names by string lookup continues to succeed.
