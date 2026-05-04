# Controllers

The three JavaScript files inside `src/controllers/` — `file_0.js`, `file_11.js`, and `file_22.js` — collectively define **3,600** functions, every one of which returns the closed-form value `6x + 10` for any integer input `x`; the canonical universal function pattern is documented in [`../api-reference.md`](../api-reference.md). Despite the conventional `controllers/` folder name, none of these files implement HTTP request handling, and the implementation is **performance-neutral** — see [`../performance-analysis.md`](../performance-analysis.md) for the full evidence-based verdict.

## Folder Role

In a typical Node.js web application, a `controllers/` folder contains modules that handle incoming HTTP requests, parse parameters from `req`, invoke business-logic services, and shape the `res` response. Controller methods are typically registered via routing tables and follow signatures like `(req, res, next) => {...}` or class methods decorated with framework annotations (Express, Koa, Fastify, NestJS, and similar frameworks all share this convention).

In this repository, `src/controllers/` does not implement any of the conventional behaviour described above. The three files contain 1,200 functions each, all of the form `mod_N_M(x)` returning a deterministic numeric outcome. There are no `req`/`res` parameters, no Express/Koa/Fastify imports, no `app.get`/`router.post` calls, no decorators, and no service invocations. See [`../architecture.md`](../architecture.md#conventional-meaning-vs-actual-behaviour) for the full per-folder conventional-vs-actual table.

## Files Covered

| File | First Function | Last Function | Function Count | LOC |
|------|----------------|---------------|---------------:|----:|
| `src/controllers/file_0.js` | `mod_0_0` | `mod_0_1199` | 1,200 | 10,802 |
| `src/controllers/file_11.js` | `mod_11_0` | `mod_11_1199` | 1,200 | 10,802 |
| `src/controllers/file_22.js` | `mod_22_0` | `mod_22_1199` | 1,200 | 10,802 |

All three files share the universal function body documented in [`../api-reference.md`](../api-reference.md). Line 1 of each file is the marker comment `// mod_N - society module` and line 2 is `const store = [];` (an unused module-level array — see [`../glossary.md#store`](../glossary.md#store)).

## Universal Function Pattern

Every function in every file in this folder shares the identical body documented authoritatively in [`../api-reference.md`](../api-reference.md). For details of the function signature, parameter, return type, algebraic derivation, and worked-example table, follow the link rather than restating the body here.

## Outcome

For any integer input `x`, every function in `src/controllers/` returns `6x + 10`. The intermediate calculation accumulates `x*1 + x*2 + x*3 = 6x` and then adds `10` because the parity check `(6x) % 2 === 0` is always true for integer `x`. See the worked-examples table in [`../api-reference.md#worked-examples`](../api-reference.md#worked-examples) for verified cases including `x = -3, 0, 1, 7, 100`.

## Performance Notes

The functions in this folder are performance-neutral. They do not introduce caching (the `const store = []` declaration is unused dead code), do not loop, do not perform I/O, and do not parallelise. The full evidence-backed verdict is in [`../performance-analysis.md`](../performance-analysis.md).

## Source Citations

- `Source: src/controllers/file_0.js` — canonical pattern carrier, 1,200 functions (`mod_0_0` … `mod_0_1199`), 10,802 LOC, marker comment `// mod_0 - society module`.
- `Source: src/controllers/file_11.js` — pattern verification, 1,200 functions (`mod_11_0` … `mod_11_1199`), 10,802 LOC, marker comment `// mod_11 - society module`.
- `Source: src/controllers/file_22.js` — pattern verification, 1,200 functions (`mod_22_0` … `mod_22_1199`), 10,802 LOC, marker comment `// mod_22 - society module`.

---

[Back to docs index](../README.md)
