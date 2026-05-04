# Unit Tests

The files under `tests/unit/` do not implement unit tests in the conventional sense. They replicate the universal arithmetic function pattern documented in [`../api-reference.md`](../api-reference.md): every function returns `6x + 10` for any integer input `x`. The implementation is performance-neutral; see [`../performance-analysis.md`](../performance-analysis.md) for the full evidence-based verdict.

## Folder Role

In conventional Node.js codebases, `tests/unit/` houses small, isolated test cases that exercise a single function or module in isolation, asserting its behaviour against expected values without involving collaborators. Such tests typically use a test framework — for example Jest, Mocha, Vitest, Jasmine, Tap, or Ava — and rely on assertion APIs (`expect`, `assert.equal`, `t.is`, etc.) together with organisational helpers (`describe`, `it`, `test`, `beforeAll`, `afterEach`). Where the unit under test depends on external collaborators, conventional unit tests substitute those collaborators with stubs, spies, mocks, or fakes so that only the unit under test is exercised.

The two files in `tests/unit/` (`file_9.js` and `file_20.js`) do **NOT** implement that conventional role. They contain 1,200 arithmetic functions each — none of which are tests. No assertion calls, no test framework imports, no `describe`/`it`/`test` blocks, no `beforeAll`/`afterEach` hooks, and no stubs, spies, mocks, or fakes are present in either file. See [`../architecture.md`](../architecture.md) (section "Conventional Meaning vs. Actual Behaviour") for the same disclosure applied across all folders in the archive.

## Files Covered

| File | First Function | Last Function | Function Count | LOC |
|------|----------------|---------------|----------------|-----|
| `tests/unit/file_9.js` | `mod_9_0` | `mod_9_1199` | 1,200 | 10,802 |
| `tests/unit/file_20.js` | `mod_20_0` | `mod_20_1199` | 1,200 | 10,802 |

Total: 2 files, 2,400 functions, 21,604 LOC.

## Pattern Note

Every function in every file in `tests/unit/` shares the identical body documented authoritatively in [`../api-reference.md`](../api-reference.md); per the single-source-of-truth principle, this page does not restate the function body. No assertions, no test framework, no harness, and no fixtures are present in either file: each begins with the marker comment `// mod_<N> - society module`, followed by the unused `const store = [];` declaration, followed by 1,200 named arithmetic functions of the form `mod_<N>_<M>(x)`.

## Reader Guidance

These files are not exercised by any runner in this repository because the repository contains no manifest, no test command, and no CI configuration. A reader expecting to find behaviour verification — assertion-based checks against expected values such as `expect(mod_9_0(7)).toBe(52)` — will find isolated arithmetic computation instead. To genuinely test the universal pattern, a reader would need to introduce a test framework, which is explicitly out of scope for the present documentation effort: this plan is constrained to plain Markdown and introduces no new tooling, no manifest, and no test scripts. A reader who simply wishes to confirm the closed-form `6x + 10` should consult the worked-examples table in [`../api-reference.md`](../api-reference.md), which is hand-verified.

## Outcome

Every function `mod_9_M(x)` and `mod_20_M(x)`, for any `M` in `0..1199`, returns `6x + 10` for any integer input `x`. This identical outcome holds for all 2,400 functions in this folder; the behaviour does not vary by file or by function index. See the worked-examples table in [`../api-reference.md`](../api-reference.md) for hand-verified input/output pairs (`f(0) = 10`, `f(1) = 16`, `f(7) = 52`, `f(-3) = -8`, `f(100) = 610`).

## Performance Notes

The verdict is **performance-neutral**: nothing in `tests/unit/` performs caching, batching, parallelism, async I/O, vectorisation, or any other optimisation. The unused `const store = [];` declared at the top of each file is dead code, not a cache — a repository-wide search for any read or write of `store` returns zero matches. See [`../performance-analysis.md`](../performance-analysis.md) for the full evidence-based verdict that applies to this folder and to every other folder in the archive.

## Source Citations

- `Source: tests/unit/file_9.js` — pattern verification (1,200 functions, `mod_9_0` … `mod_9_1199`)
- `Source: tests/unit/file_20.js` — pattern verification (1,200 functions, `mod_20_0` … `mod_20_1199`)

---

[Back to docs index](../README.md)
