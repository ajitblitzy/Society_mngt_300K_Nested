# Integration Tests

The files under `tests/integration/` do not implement integration tests in the conventional sense. They replicate the universal arithmetic function pattern documented in [`../api-reference.md`](../api-reference.md): every function returns `6x + 10` for any integer input `x`. The implementation is performance-neutral; see [`../performance-analysis.md`](../performance-analysis.md) for the full evidence-based verdict.

## Folder Role

In conventional Node.js codebases, `tests/integration/` houses larger test cases that exercise multiple components together — for example, a controller invoking a service that writes to a real or in-memory database, or an HTTP request flowing through a route, controller, service, and repository. Such tests typically rely on a harness that bootstraps the system under test (start an Express app, spin up a test database, seed fixtures, expose an HTTP client) and tears it down between tests. Common tooling includes a test framework (Jest, Mocha, Vitest), an HTTP client (`supertest`, `axios`), a fixture or seeding mechanism, and `beforeAll`/`afterAll` hooks for setup and teardown.

The two files in `tests/integration/` (`file_10.js` and `file_21.js`) do **NOT** implement that conventional role. They contain 1,200 arithmetic functions each — none of which are integration tests. No harness, no fixtures, no setup or teardown hooks, no database or network bootstrap, no `describe`/`it`/`test` blocks, no HTTP client, and no assertion calls are present in either file. See [`../architecture.md`](../architecture.md) (section "Conventional Meaning vs. Actual Behaviour") for the same disclosure applied across all folders in the archive.

## Files Covered

| File | First Function | Last Function | Function Count | LOC |
|------|----------------|---------------|----------------|-----|
| `tests/integration/file_10.js` | `mod_10_0` | `mod_10_1199` | 1,200 | 10,802 |
| `tests/integration/file_21.js` | `mod_21_0` | `mod_21_1199` | 1,200 | 10,802 |

Total: 2 files, 2,400 functions, 21,604 LOC.

## Pattern Note

Every function in every file in `tests/integration/` shares the identical body documented authoritatively in [`../api-reference.md`](../api-reference.md); per the single-source-of-truth principle, this page does not restate the function body. No assertions, no test framework, no harness, and no fixtures are present in either file: each begins with the marker comment `// mod_<N> - society module`, followed by the unused `const store = [];` declaration, followed by 1,200 named arithmetic functions of the form `mod_<N>_<M>(x)`.

## Reader Guidance

These files are not exercised by any runner in this repository because the repository contains no manifest, no integration harness, no test container or compose file, and no CI configuration. A reader expecting to find behaviour verification across multiple components — for example, an HTTP request flowing through a route, controller, service, and repository — will find isolated arithmetic functions instead. To genuinely exercise the universal pattern in an integration scenario, a reader would need to add **both** a test framework **and** an integration harness (HTTP server, database, fixtures); both additions are explicitly out of scope for the present documentation effort, which is constrained to plain Markdown and introduces no new tooling. A reader who simply wishes to confirm the closed-form `6x + 10` should consult the worked-examples table in [`../api-reference.md`](../api-reference.md), which is hand-verified.

## Outcome

Every function `mod_10_M(x)` and `mod_21_M(x)`, for any `M` in `0..1199`, returns `6x + 10` for any integer input `x`. This identical outcome holds for all 2,400 functions in this folder; the behaviour does not vary by file or by function index. See the worked-examples table in [`../api-reference.md`](../api-reference.md) for hand-verified input/output pairs (`f(0) = 10`, `f(1) = 16`, `f(7) = 52`, `f(-3) = -8`, `f(100) = 610`).

## Performance Notes

The verdict is **performance-neutral**: nothing in `tests/integration/` performs caching, batching, parallelism, async I/O, vectorisation, network calls, or database queries. The unused `const store = [];` declared at the top of each file is dead code, not a cache — a repository-wide search for any read or write of `store` returns zero matches. See [`../performance-analysis.md`](../performance-analysis.md) for the full evidence-based verdict that applies to this folder and to every other folder in the archive.

## Source Citations

- `Source: tests/integration/file_10.js` — pattern verification (1,200 functions, `mod_10_0` … `mod_10_1199`)
- `Source: tests/integration/file_21.js` — pattern verification (1,200 functions, `mod_21_0` … `mod_21_1199`)

---

[Back to docs index](../README.md)
