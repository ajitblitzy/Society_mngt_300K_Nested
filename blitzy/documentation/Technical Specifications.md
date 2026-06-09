# Technical Specification

# 0. Agent Action Plan

## 0.1 Executive Security Intent Summary

### 0.1.1 Core Security Objective

Based on the security concern described, the Blitzy platform understands that the security vulnerability to resolve is **any latent weakness present in the source tree of the `Ajit-backprop-test` repository, with explicit emphasis on the manual-memory-management defect class targeted by the user's "Security vulnerabilities" rule**. The user's verbatim request is: "Scan the code and fix teh security vulnerabilites in the code. While fixing do ensure the performance of the code is not degraded."

The platform decomposes this directive into the following technically precise requirements:

- **Audit obligation**: Perform an exhaustive scan of the entire 300,000-line, 30-file source corpus across every standard vulnerability class (memory safety, injection, deserialization, cryptography, authentication, configuration, supply-chain, and prototype-pollution) and produce a defensible, file-by-file finding inventory.
- **Remediation obligation**: For every finding identified by the audit, apply the smallest, surgically targeted fix that fully eliminates the defect without altering unrelated functionality.
- **Performance preservation obligation**: Every remediation must be reviewed against a "no measurable runtime regression" bar before acceptance; algorithmic complexity, instruction count, memory footprint, and cache behavior must be at parity with the pre-fix baseline.
- **Rule-compliance obligation**: The user-supplied rule "Never use new/delete directly - use std::make_unique/std::make_shared" must govern every memory-ownership decision made during remediation wherever the rule's target language is present in the corpus.

| Field | Value |
|-------|-------|
| Vulnerability category | Multiple vulnerabilities (audit-driven scan) with explicit emphasis on **memory-safety / manual-memory-management** as anchored by the user-supplied rule |
| Severity level | **Variable / N/A for active codebase** — see 0.2 for per-class CVSS reasoning; the live audit produced zero findings, so no live severity applies |
| Compliance frame | C++ Core Guidelines (R.10, R.11, R.20, R.22, R.23), CERT C++ MEM50/51/52-CPP, CWE-401/415/416/457/762 |
| Backward compatibility | Must be preserved; no breaking changes to behavior, public surface, file structure, or license |
| Performance contract | Zero measurable degradation; verified by the absence of edits in the final diff |
| Implicit requirements | Audit completeness must be demonstrable, not merely asserted; the rule must be captured verbatim even when its target language is absent; future-applicability guidance must be recorded for forward defense |

### 0.1.2 Special Instructions and Constraints

The platform records the following special instructions that govern execution. Each item is preserved exactly as supplied or derived directly from supplied input.

- **User Example (verbatim)**: "Scan the code and fix teh security vulnerabilites in the code. While fixing do ensure the performance of the code is not degraded."
- **User Rule (verbatim)**: "Never use new/delete directly - use std::make_unique/std::make_shared" (rule name: "Security vulnerabilities")
- **Change scope preference**: **Minimal**. The rule's phrasing ("Never ... use ...") is a substitution mandate, not a refactor mandate; the user's primary directive is "fix the vulnerabilities", not "rewrite the code". The platform will therefore default to the smallest possible diff that satisfies the security objective.
- **Performance constraint**: No degradation permitted. The fix strategy must show that any chosen remediation either has demonstrably equivalent or strictly better runtime characteristics than the pre-fix code.
- **Backward compatibility**: Must be preserved — public function names, exported symbols, module boundaries, and file paths must remain stable.
- **Web research requirement**: The platform must consult authoritative public guidance for the user's rule (C++ Core Guidelines, CERT C++ MEM rules, CWE/MITRE) and OWASP for the broader audit; findings are summarized in 0.2.
- **Compliance posture**: All remediations must be defensible against established secure-coding standards; ad-hoc fixes are not acceptable.

### 0.1.3 Technical Interpretation

This security request translates to the following technical fix strategy:

- **To resolve manual-memory-management defects** (the rule's target class), **replace** every owning raw pointer construction `T* p = new T(args)` with `auto p = std::make_unique<T>(args)` for unique ownership, or `auto p = std::make_shared<T>(args)` for genuinely shared ownership; remove every paired `delete p` because the smart pointer's destructor performs the release.
- **To resolve any non-memory-safety vulnerabilities** discovered during the broader audit (injection, XSS, deserialization, weak crypto, secret leakage, prototype pollution, supply-chain), apply the canonical OWASP-aligned remediation appropriate to the specific defect, with target-file-first transformation tables.
- **To preserve performance**, prefer remediations whose hot-path overhead is provably equal to or less than the pre-fix code: smart pointers in modern toolchains are zero-overhead vs. raw owning pointers; `std::make_shared` performs a single allocation versus the two-allocation pattern of `shared_ptr<T>(new T(...))` and is therefore strictly better; sanitization helpers (e.g., parameterized queries, `Object.create(null)` maps) cost the same or less than their unsafe counterparts.
- **To honor backward compatibility**, every signature, header, and public symbol that previously accepted or returned a raw owning pointer is updated to convey ownership explicitly (`unique_ptr<T>` parameters/returns, `T&` for non-owning access) without renaming.

The user's understanding level is classified as **General security concern** rather than an explicit CVE reference: the request names a posture ("fix the security vulnerabilities") and supplies a rule, but does not enumerate specific CVE identifiers, vulnerable package names, or exploit symptoms. The platform therefore performs both a comprehensive scan and an authoritative-guidance lookup before proposing any remediation.

The actual outcome of executing this strategy against the present repository is documented in 0.3 and following sub-sections; the strategy itself stands as the engineering plan that would be applied to any matching defect.

## 0.2 Vulnerability Research and Classification

### 0.2.1 Initial Assessment

The user's request did not name any specific CVE identifiers, vulnerable package names, or symptom descriptions. The platform therefore extracts security-relevant signals exclusively from the user input and the supplied rule:

| Signal Type | Value(s) extracted |
|-------------|--------------------|
| CVE numbers mentioned | None |
| Vulnerability names | None named directly; rule implies the manual-memory-management family (CWE-401/415/416/457/762) |
| Affected packages | None named (no manifest exists in the repository — verified) |
| Symptoms described | None |
| Security advisories referenced | None |
| Implicit signals from rule | "new/delete directly" pattern → memory-safety defect family in C/C++ |
| Implicit signals from user phrasing | "scan ... fix ... vulnerabilities" → comprehensive audit posture across all common classes |

Because no specific defect was named, the platform treats this as a **comprehensive audit request** with the rule's CWE family elevated to primary research priority and the remaining OWASP-aligned classes treated as secondary research priorities.

### 0.2.2 Required Web Research

The platform's research strategy was informed by authoritative public reference frameworks. For the rule's defect family the relevant authorities are:

- **ISO C++ Core Guidelines** — the canonical guide co-edited by Bjarne Stroustrup and Herb Sutter; rules R.10, R.11, R.20, R.22, and R.23 are the direct authority for the user-supplied rule
- **CERT C++ Secure Coding Standard** — Carnegie Mellon Software Engineering Institute; MEM50-CPP, MEM51-CPP, and MEM52-CPP are the direct authority for memory-management hygiene
- **CWE / MITRE Common Weakness Enumeration** — the standard taxonomy for software weakness classification
- **OWASP** — the Open Web Application Security Project; the OWASP Top 10 and OWASP Cheat Sheet Series are the standard frameworks for application-layer audit

For the broader audit (non-memory-safety classes), the platform additionally framed its scan against:

- **OWASP Top 10 (current major release)** — the de-facto checklist for application-layer audits
- **OWASP ASVS (Application Security Verification Standard)** — for control-objective coverage
- **GitHub Security Advisories Database / npm advisory feed / OSV.dev** — would be consulted only if a manifest existed; no manifest exists, so this consultation is moot
- **NVD (National Vulnerability Database)** — would be consulted only if vulnerable packages or specific CVEs were named; none were

Research findings (synthesized, framework-level — no external content reproduced):

- The user's rule is precisely consistent with C++ Core Guidelines R.11 ("Avoid calling `new` and `delete` explicitly"), reinforced by R.20 (use `unique_ptr` or `shared_ptr` for ownership) and R.22/R.23 (prefer `make_shared`/`make_unique` factory functions).
- The CWE classes the rule preempts are CWE-401 (Memory Leak), CWE-415 (Double Free), CWE-416 (Use After Free), CWE-457 (Use of Uninitialized Variable), and CWE-762 (Mismatched Memory Management Routines).
- For modern C++ toolchains (post-C++14), `make_unique` introduces zero overhead versus raw `new` and gives exception-safety; `make_shared` consolidates the data block and the control block into a single heap allocation, which is **strictly better than `shared_ptr<T>(new T(...))`**, supporting the user's "no performance degradation" constraint.

### 0.2.3 Vulnerability Classification

The user's rule and the broader audit map onto the following vulnerability classifications.

#### 0.2.3.1 Rule-Targeted Class (Primary)

| Attribute | Value |
|-----------|-------|
| Vulnerability type | Manual-memory-management defects |
| CWE coverage | CWE-401, CWE-415, CWE-416, CWE-457, CWE-762 |
| Attack vector | Typically Local; can escalate to Network when exposed via untrusted input paths |
| Exploitability | High (memory-corruption defects are widely understood and tooled) |
| Impact | Confidentiality + Integrity + Availability (full triad) |
| Root cause | Explicit use of `new`/`delete` operators producing ownership ambiguity, exception-safety gaps, and lifetime errors |
| Typical CVSS framing | High–Critical (CWE-415/416 typically 7.0–9.8); Medium (CWE-401 typically 5.0–6.5) |

#### 0.2.3.2 Broader Audit Classes (Secondary)

The platform additionally scanned for the following classes during context-gathering. Each is included here for completeness so the AAP demonstrates audit breadth.

| Class | Representative CWE | Repository Finding |
|-------|--------------------|---------------------|
| Injection (SQL/Command/Code) | CWE-78, CWE-89, CWE-94 | Zero matches |
| Cross-Site Scripting (XSS) | CWE-79 | Zero matches |
| Cross-Site Request Forgery | CWE-352 | Zero matches |
| Insecure Deserialization | CWE-502 | Zero matches |
| Path Traversal | CWE-22 | Zero matches |
| Broken Access Control | CWE-284 | Zero matches |
| Hardcoded Credentials | CWE-798 | Zero matches |
| Weak Cryptography | CWE-327, CWE-328 | Zero matches |
| Prototype Pollution | CWE-1321 | Zero matches |
| Vulnerable & Outdated Components | CWE-1104 | Zero applicable (no dependency manifest exists) |
| Insecure Configuration | CWE-16 | Zero applicable (no configuration files exist) |

### 0.2.4 Web Search Research Conducted

| Research Topic | Authoritative Framework | Finding Used in AAP |
|----------------|-------------------------|---------------------|
| Replacement for raw `new`/`delete` | C++ Core Guidelines R.10/R.11/R.20/R.22/R.23 | Use `std::make_unique` / `std::make_shared`; declare ownership in signatures |
| Memory-management secure-coding rules | CERT C++ MEM50-CPP, MEM51-CPP, MEM52-CPP | Match raw allocations with their proper deallocators; prefer RAII |
| CWE classification for memory defects | CWE/MITRE | CWE-401, CWE-415, CWE-416, CWE-457, CWE-762 |
| Broad audit framing | OWASP Top 10, OWASP ASVS | Used to structure the 10-class repository scan |
| Dependency CVE lookup | NVD, GitHub Advisories, OSV.dev | Not applicable — no dependency manifest exists |
| Performance characteristics of smart pointers | C++ Core Guidelines R.22 commentary; well-documented in major-toolchain implementation reports | `make_shared` performs a single allocation; `make_unique` is zero-overhead vs. raw `new` |

The research framing is intentionally cited at the framework level (no external content quoted) to keep the AAP authoritative without taking on third-party content liability, consistent with the platform's documentation discipline.

## 0.3 Security Scope Analysis

### 0.3.1 Affected Component Discovery

The platform performed an exhaustive, evidence-based scan across the entire 30-file, 300,000-line source corpus. The scan covered ten vulnerability families using the following representative pattern set, executed against every file under `src/` and `tests/`:

| Family | Pattern (regex) | Matches |
|--------|-----------------|---------|
| C++ memory management | `\bnew\s+\w`, `\bdelete\s+\w`, `\bmalloc\(`, `\bfree\(`, `\bcalloc\(`, `\brealloc\(` | **0** |
| Injection sinks | `\beval\(`, `\bFunction\(`, `child_process`, `\bspawn\(`, `\bexec\(`, raw `\bquery\(` | **0** |
| XSS / DOM sinks | `innerHTML`, `outerHTML`, `document\.write`, `dangerouslySetInnerHTML`, `insertAdjacentHTML` | **0** |
| Deserialization / parsing | `JSON\.parse`, `JSON\.stringify`, `YAML\.`, `loadAll`, `unserialize` | **0** |
| Path / file / process / network I/O | `\bfs\.`, `\bpath\.`, `\bprocess\.`, `\bhttp\.`, `\bhttps\.`, `\bnet\.`, `\bdns\.`, `\btls\.`, `\bcrypto\.`, `\bos\.`, `\bcluster\.`, `\bdgram\.` | **0** |
| Auth / secrets / PII | `password`, `secret`, `api_key`, `token`, `jwt`, `bearer`, `credential`, `aws_`, `database_url`, `mongodb`, `postgres`, `redis` | **0** |
| Weak cryptography | `createCipher`, `createDecipher`, `createHash`, `MD5`, `SHA1`, `RC4`, `DES`, `3DES`, `crypto\.`, `Math\.random` | **0** |
| Module system / globals | `\brequire\(`, `\bimport\b`, `module\.exports`, `exports\.`, `global\.`, `globalThis`, `window\.`, `self\.` | **0** |
| Prototype pollution | `__proto__`, `prototype\[`, `Object\.assign\(.*req`, `merge\(.*req`, `extend\(.*req` | **0** |
| Class / Promise / Buffer | `\bclass\b`, `constructor`, `\bBuffer\.`, `new Buffer`, `\bPromise\.`, `\basync\b`, `\bawait\b` | **0** |

**Aggregate result**: vulnerability scan affects **0 files across 0 directories**.

The corpus structure was independently verified by full enumeration:

```
src/config/         file_6.js, file_17.js
src/controllers/    file_0.js, file_11.js, file_22.js
src/domain/        file_8.js, file_19.js
src/middleware/    file_5.js, file_16.js, file_27.js
src/models/        file_2.js, file_13.js, file_24.js
src/repositories/  file_7.js, file_18.js
src/routes/        file_3.js, file_14.js, file_25.js
src/services/      file_1.js, file_12.js, file_23.js
src/utils/         file_4.js, file_15.js, file_26.js, filler.js
tests/integration/ file_10.js, file_21.js
tests/unit/        file_9.js, file_20.js
LICENSE/LICENSE.txt (MIT, Copyright (c) 2026)
README.md
```

A line-uniqueness analysis revealed that the entire 300,000-line corpus condenses to **35,141 distinct lines**, and each distinct line matches one of exactly four idiom patterns:

- Module-header comment (e.g., `// mod_0 - society module`)
- A locally declared but unused `const store = [];`
- Functions of the form `function mod_N_M(x){ let r=0; r+=x*1; r+=x*2; r+=x*3; if(r%2===0){r+=10} return r; }`
- Filler comments (e.g., `// filler 298001`) confined to `src/utils/filler.js`

There is no remaining content outside those four idioms. By construction the corpus contains no I/O, no network, no rendering, no parsing, no cryptography, no authentication, no module imports, no global mutations, and no manual memory management.

### 0.3.2 Root Cause Identification

Because the audit produced zero findings, no live root cause exists in the active repository. The platform records the **rule-targeted root cause** for completeness, since this is the defect family the user's rule preempts:

- **General root cause for the rule's class**: explicit use of the `new` and `delete` operators in C++ leads to ambiguous ownership, exception-safety gaps (allocation-then-throw sequences leak), and lifetime errors. Smart pointers (`unique_ptr`, `shared_ptr`) make ownership explicit at the type level and use RAII to guarantee deterministic release at scope exit, eliminating CWE-401/415/416/457/762 by construction.
- **Repository-specific root cause**: **none identified**. The combination of (a) absence of any C/C++ source files, (b) absence of any I/O or network surface in the JavaScript corpus, and (c) absence of any third-party dependency manifest jointly removes every credible attack path.

Vulnerability propagation tracing:

| Propagation Vector | Status in Repository |
|--------------------|----------------------|
| Direct usage of vulnerable patterns | None — confirmed by the 10-family scan in 0.3.1 |
| Indirect dependencies | None — no manifest exists |
| Configuration enablers | None — no configuration files exist |
| Build-time enablers | None — no build system or CI pipeline exists |

### 0.3.3 Current State Assessment

| Attribute | Value |
|-----------|-------|
| Vulnerable package — current version | None (no manifest, no packages installed) |
| Vulnerable code pattern — location | None (file:lines = N/A) |
| Vulnerable configuration — file:setting | None (no configuration files) |
| Scope of exposure | None — the corpus has no public-facing surface, no API endpoints, no DOM rendering, no I/O, no network sockets, and no shell invocation |
| Rule applicability — `new`/`delete` sites | Zero (C/C++ source is absent from the repository) |
| Audit reproducibility | The full pattern set in 0.3.1 is reproducible via `grep -RInE '<pattern>' src tests` |

The current state of the repository is therefore best characterized as **secure-by-absence** for every scanned class: the codebase has no behaviors that could introduce the corresponding defect families. This finding is reported honestly and without inflation; the AAP nonetheless remains complete because the user-supplied rule and the broader audit obligations are documented for present compliance and forward-applicability.

## 0.4 Version Compatibility and Secure-Pattern Research

### 0.4.1 Secure Version Identification

No vulnerable dependency was identified in the live audit because no dependency manifest exists in the repository. The "secure version" matrix is therefore expressed at the **language and toolchain** level, anchored to the user-supplied rule:

| Component | Current state in repo | Secure / required level for rule applicability | Rationale |
|-----------|------------------------|------------------------------------------------|-----------|
| C++ language standard | N/A — no C/C++ source present | **C++14 minimum**, **C++17 strongly preferred**, **C++20 ideal** | `std::make_unique` was added in C++14 (LWG defect 2401 / N3656); `std::make_shared` was added in C++11 but its array form requires C++20 |
| Standard library implementation | N/A | libstdc++ (GCC 5+), libc++ (Clang 3.5+), or MSVC STL with C++14 conformance | These implement zero-overhead `make_unique` and consolidated `make_shared` allocation |
| Build / lint tooling | None present | clang-tidy with `cppcoreguidelines-owning-memory`, `cppcoreguidelines-no-malloc`, `modernize-make-unique`, `modernize-make-shared` | These checks operationalize the rule statically |
| Sanitizers | None present | AddressSanitizer + LeakSanitizer + UndefinedBehaviorSanitizer (compile-time toggles in GCC/Clang) | Runtime detection of CWE-415/416/401 if regressions occur |
| JavaScript runtime | None pinned in repo | Any modern Node.js LTS would suffice; no edits required because no JS code is being changed | The codebase contains no `require`/`import` and no runtime-dependent constructs |
| Dependency manifests | None | None required — there are no third-party dependencies to upgrade | Confirmed via filesystem search |

For dependency upgrades, the per-package CVE table that would normally appear here is empty:

| Package | Current Version | First Patched Version | Recommended Version | Breaking Changes |
|---------|-----------------|------------------------|----------------------|-------------------|
| _none_ | _n/a_ | _n/a_ | _n/a_ | _n/a_ |

### 0.4.2 Compatibility Verification

The platform verified compatibility along three axes that would matter if the rule's target language were introduced and the rule were enforced:

- **Language compatibility**: any C++ codebase already at C++14 or later natively supports both `std::make_unique` and `std::make_shared`; no language-version regression is required.
- **Standard-library compatibility**: all major STL implementations shipping with GCC 5+, Clang 3.5+, and MSVC 14.0+ provide the required factory functions; there is no need for substitute libraries (e.g., `boost::make_unique`) on any current toolchain.
- **Inter-dependency compatibility**: there is nothing in the present repository that depends on raw owning pointer semantics, so the contingent fix has zero co-dependency conflict to resolve.

#### 0.4.2.1 Alternative-Package Analysis (for completeness)

The user's rule prescribes a substitution **within** the standard library; it does not call for the replacement of any third-party package. No alternative-package analysis is required for the active codebase. Should a future C++ component depend on a library that itself returns raw owning pointers, the platform's policy is to wrap such returns in `std::unique_ptr<T, Deleter>` at the call site — preserving the dependency while restoring rule compliance — rather than replacing the dependency.

| Replacement Candidate | Trigger Condition | Migration Complexity | API Differences |
|------------------------|-------------------|----------------------|-----------------|
| `boost::make_unique` → `std::make_unique` | Codebase already at C++14+ | Low (drop-in) | Header change only |
| Custom factory that returns `T*` → factory returning `unique_ptr<T>` | Internal factory under our control | Low | Caller adopts smart-pointer semantics |
| Third-party library returning `T*` (no source control) | Library API is the only option | Low at call site | Wrap return in `unique_ptr<T, CustomDeleter>` |

The above table is provided as forward-applicable engineering guidance; none of the rows apply to the present repository because no C++ assets and no third-party dependencies exist.

## 0.5 Security Fix Design

### 0.5.1 Minimal Fix Strategy

**Principle**: apply the smallest possible change that completely addresses the vulnerability.

For the present repository the optimal minimal fix is **the empty diff**. Because the audit in 0.3 produced zero findings across all ten scanned vulnerability families, no source change is required to satisfy the user's "fix the vulnerabilities" objective; any edit would violate the minimal-change discipline. The fix design nonetheless commits explicitly to the substitution rule as forward-applicable policy: if any of the listed defect signatures appear later, the platform applies the targeted substitutions defined below.

#### 0.5.1.1 Fix Approach Selection

Fix approach: **None active for the present scan** (zero findings) → forward-applicable as **Code patch (substitution rule)** for any future C/C++ asset that introduces the rule's target pattern; **Configuration change** if any future configuration file enables an attack vector; **Dependency update** if any future manifest introduces a vulnerable package version.

#### 0.5.1.2 Substitution Recipes (the rule, made operational)

For dependency vulnerabilities (forward-applicable):

- "Upgrade `<package>` from `<current>` to `<patched-version>`" using the smallest compatible bump per the security advisory.
- Justification: the CVE/advisory link is recorded in 0.7 at the time the fix is proposed.
- Side effects: enumerated when applicable; defaulted to "none expected" when the upgrade is patch-level only.

For code vulnerabilities (forward-applicable, anchored on the user rule):

- "Apply targeted fix to the construction site by replacing `T* p = new T(args)` with `auto p = std::make_unique<T>(args)`."
- "Apply targeted fix to the construction site by replacing `T* p = new T(args)` with `auto p = std::make_shared<T>(args)` only when shared ownership is genuinely required."
- "Remove paired `delete p` because the smart pointer's destructor now performs the release."
- "Implement RAII in `<location>` to prevent CWE-401/415/416 by construction."
- Rationale: C++ Core Guidelines R.11/R.20/R.22/R.23.

For configuration vulnerabilities (forward-applicable):

- "Update the security-relevant setting from the insecure value to the secure value documented by the framework's hardening guide."
- Security improvement: explained per setting in 0.6 if any such file is later added.

A short, language-canonical example demonstrates the substitution:

```cpp
// non-compliant (raw ownership; CWE-401/415/416 risk)
Widget* w = new Widget(args);
// ...
delete w;

// compliant (unique ownership)
auto w = std::make_unique<Widget>(args);
// ...
// no explicit delete — destructor releases at scope exit

// compliant (shared ownership, only when truly required)
auto w = std::make_shared<Widget>(args);
```

### 0.5.2 Dependency Replacement Analysis

No dependency replacement is in scope. The repository has zero dependency manifests, therefore there is no third-party package to replace, downgrade, or pin. The contingency framework recorded below applies only if a future change introduces a dependency that turns out to be vulnerable and unmaintained.

| Trigger | Replacement Rule | Compatibility Action | API-Difference Action |
|---------|------------------|----------------------|------------------------|
| Vulnerable package, patch unavailable, package unmaintained | Replace with maintained alternative offering equivalent or superior security posture | Verify alternative supports the same feature surface used by the codebase | Update import sites; preserve public function names; add adapter shim if necessary |
| Vulnerable package, patched version available | Upgrade in-place | Verify patched version supports the existing API | None typical for patch-level bumps |
| Vulnerable package, breaking-change patched version | Upgrade with localized signature updates | Verify against test suite | Update call sites enumerated in 0.6 |

Full replacement scope (general template, no current rows):

- All import statements requiring updates: _none_
- All function calls needing modification: _none_
- All configuration files requiring changes: _none_
- All test files needing updates: _none_

### 0.5.3 Security Improvement Validation

How the substitution rule eliminates the rule-targeted defect family (forward-applicable):

- **CWE-401 (Memory Leak)**: the smart pointer's destructor releases the resource deterministically at scope exit, including paths that exit via exception, eliminating leak windows that arise from missed `delete` calls.
- **CWE-415 (Double Free)**: `unique_ptr` move-only semantics prevent two owners from coexisting; `shared_ptr` reference-counts the deletion so double-release is structurally impossible.
- **CWE-416 (Use After Free)**: ownership is type-encoded; non-owning observers must hold `T&` or `T*` borrowed from the smart pointer; the smart pointer's lifetime defines validity.
- **CWE-457 (Use of Uninitialized Variable)**: `make_unique`/`make_shared` perform value-initialization or constructor invocation in a single call, eliminating the construct-then-init split that risks reading uninitialized state.
- **CWE-762 (Mismatched Memory Management Routines)**: the factory functions allocate via `operator new`/`make_shared` internally, and the destructor uses the matching deallocator automatically; mismatched pairings (e.g., `delete` over `malloc`) cannot occur.

Verification methods for the present (zero-edit) scope:

- **Code review**: the empty diff makes review trivially short and disposable.
- **Pattern scan re-run**: the ten-family `grep`-based regression command set is the verification test — passing means every family continues to return zero matches.
- **Manual inspection**: distinct-line inventory remains 35,141 with all four idioms intact.

Verification methods activated if the rule's target language is later introduced:

- **Static analysis**: `clang-tidy` with `cppcoreguidelines-owning-memory`, `cppcoreguidelines-no-malloc`, `modernize-make-unique`, `modernize-make-shared`, `modernize-avoid-c-arrays`.
- **Sanitizer-instrumented test runs**: AddressSanitizer + LeakSanitizer + UndefinedBehaviorSanitizer.
- **Penetration-testing-grade review**: not applicable absent untrusted input paths; recorded for completeness.

Rollback plan if any future fix introduces issues:

- The only fix surface is a single substitution of `new`/`delete` for a smart-pointer factory; if regressions occur, revert the substitution using the source-control history; the substitution is a purely local, line-bounded edit and rolls back deterministically.

## 0.6 File Transformation Mapping

### 0.6.1 File-by-File Security Fix Plan

Transformation modes: `UPDATE` (modify in place to remediate a finding), `CREATE` (add a new file required for security), `DELETE` (remove a file that introduces a vulnerability), `REFERENCE` (audited and confirmed clean — kept here for evidentiary completeness).

The audit produced **zero `UPDATE`/`CREATE`/`DELETE` rows** because no finding was identified. Each existing file is therefore listed as `REFERENCE` to demonstrate audit coverage. Target files are listed first.

| Target File | Transformation | Source File / Reference | Security Changes |
|-------------|----------------|--------------------------|-------------------|
| `README.md` | REFERENCE | `README.md` | Audited; contains a 2-line project description and no executable content |
| `LICENSE/LICENSE.txt` | REFERENCE | `LICENSE/LICENSE.txt` | Audited; standard MIT License (Copyright (c) 2026); preserved unchanged |
| `src/config/file_6.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/config/file_17.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/controllers/file_0.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/controllers/file_11.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/controllers/file_22.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/domain/file_8.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/domain/file_19.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/middleware/file_5.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/middleware/file_16.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/middleware/file_27.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/models/file_2.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/models/file_13.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/models/file_24.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/repositories/file_7.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/repositories/file_18.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/routes/file_3.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/routes/file_14.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/routes/file_25.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/services/file_1.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/services/file_12.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/services/file_23.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/utils/file_4.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/utils/file_15.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/utils/file_26.js` | REFERENCE | self | 10-class scan: zero matches |
| `src/utils/filler.js` | REFERENCE | self | Pure padding comments only; 10-class scan: zero matches |
| `tests/integration/file_10.js` | REFERENCE | self | 10-class scan: zero matches |
| `tests/integration/file_21.js` | REFERENCE | self | 10-class scan: zero matches |
| `tests/unit/file_9.js` | REFERENCE | self | 10-class scan: zero matches |
| `tests/unit/file_20.js` | REFERENCE | self | 10-class scan: zero matches |

Forward-applicable transformation rows (these activate **only if** a future change introduces a matching site; they are recorded so the AAP is operational rather than aspirational):

| Target File | Transformation | Source File / Reference | Security Changes |
|-------------|----------------|--------------------------|-------------------|
| `<future>.cpp` / `<future>.cc` / `<future>.cxx` containing `T* p = new T(...)` | UPDATE | self | Replace with `auto p = std::make_unique<T>(...)` (or `std::make_shared<T>` only when shared ownership is genuinely required); remove paired `delete p`; ensure `#include <memory>` |
| `<future>.h` / `<future>.hpp` declaring functions returning `T*` for owning semantics | UPDATE | self | Change return type to `std::unique_ptr<T>` (owning) or `T&` (non-owning); add `#include <memory>`; preserve symbol name |
| `<future>` factory file containing `delete p;` | UPDATE | self | Remove explicit `delete` once paired construction is replaced by smart-pointer factory; lifetime is now RAII-managed |
| `<future>` containing `new T[N]` | UPDATE | self | Replace with `std::make_unique<T[]>(N)` (C++14+); remove paired `delete[] p` |
| `<future>` containing `malloc`/`free`/`calloc`/`realloc` | UPDATE | self | Replace with the appropriate C++ smart-pointer/factory pattern per CWE-762 guidance |
| `<future>/package.json` introducing third-party packages | UPDATE | self | Pin to non-vulnerable versions; record CVE/advisory in 0.7 |
| `<future>/.clang-tidy` | CREATE | _new_ | Enable `cppcoreguidelines-owning-memory`, `cppcoreguidelines-no-malloc`, `modernize-make-unique`, `modernize-make-shared` to enforce the rule statically |

The forward-applicable rows are documented as engineering policy, not as proposed edits to the present diff. They will not be created in the active scope because the trigger conditions are absent.

### 0.6.2 Code Change Specifications

For the present scope, no code change specifications apply because no file changes. The general template the platform uses for any future fix is preserved here:

| Field | Template Value |
|-------|----------------|
| File | `<path>` |
| Lines affected | `<line range>` |
| Before state | "Currently vulnerable because `<specific code pattern>`" |
| After state | "After fix, will `<secure behavior>`" |
| Security improvement | "Eliminates `<specific CWE>`" |

Concrete instantiation for the rule's target pattern (illustrative, not active):

| Field | Example Value |
|-------|---------------|
| File | `<future>/widget_factory.cpp` |
| Lines affected | construction site and paired destructor call |
| Before state | "Currently vulnerable because `Widget* w = new Widget(args); ... delete w;` is exception-unsafe and ownership-ambiguous" |
| After state | "After fix, will use `auto w = std::make_unique<Widget>(args);` with destructor-driven release at scope exit" |
| Security improvement | "Eliminates CWE-401, CWE-415, CWE-416, CWE-457, CWE-762 by construction" |

### 0.6.3 Configuration Change Specifications

For the present scope, no configuration change applies because no configuration file exists in the repository. The general template the platform uses for any future configuration-level remediation is preserved here:

| Field | Template Value |
|-------|----------------|
| File | `<path>` |
| Setting | `<parameter>` |
| Current value | `<insecure value>` |
| New value | `<secure value>` |
| Security rationale | `<why this eliminates the vulnerability>` |

Reproducibility note: the active table above (zero `UPDATE`/`CREATE`/`DELETE` rows) is reproducible by re-running the ten-family pattern scan; the per-file `REFERENCE` entries are evidence that every file in the corpus was independently audited rather than left undocumented.

## 0.7 Dependency Inventory and Reference Updates

### 0.7.1 Security Patches and Updates

There are no security-critical package updates in scope because the repository declares no third-party dependencies. The dependency-update table is empty for the active scope:

| Registry | Package Name | Current | Patched To | CVE / Advisory | Severity |
|----------|--------------|---------|------------|-----------------|----------|
| _none_ | _none_ | _n/a_ | _n/a_ | _n/a_ | _n/a_ |

This is a definitive negative finding rather than an oversight. Filesystem search confirmed the absence of every standard manifest (`package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `npm-shrinkwrap.json`, `requirements.txt`, `Pipfile`, `Pipfile.lock`, `pyproject.toml`, `poetry.lock`, `setup.py`, `setup.cfg`, `pom.xml`, `build.gradle`, `Cargo.toml`, `Cargo.lock`, `go.mod`, `go.sum`, `Gemfile`, `Gemfile.lock`, `composer.json`, `composer.lock`, `vcpkg.json`, `conanfile.txt`, `conanfile.py`, `CMakeLists.txt`, `Makefile`, `Dockerfile*`, `docker-compose*.yml`).

### 0.7.2 Dependency Chain Analysis

| Chain Layer | Status | Reasoning |
|-------------|--------|-----------|
| Direct dependencies requiring updates | None | No manifest declares any direct dependencies |
| Transitive dependencies affected | None | No lockfile resolves any transitive graph |
| Peer dependencies to verify | None | No peer-dep declarations exist |
| Development dependencies with vulnerabilities | None | No dev-dep declarations exist |
| Container base images | None | No `Dockerfile*` present |
| CI/CD action versions | None | No workflow files present |

### 0.7.3 Import and Reference Updates

The audit confirmed that the JavaScript corpus contains zero `require(` and zero `import ` statements. There are therefore no import sites to update for the active scope.

| Update Class | Active-Scope Action |
|--------------|---------------------|
| Source files requiring import updates | None — corpus has zero `require`/`import` statements |
| Module-reference updates | None — there is no module graph to rewrite |
| Configuration reference updates | None — no configuration files exist |
| Environment variable updates | None — no `.env*` files exist |
| Documentation updates referencing old packages | None — `README.md` does not reference any package |

For the rule's target language, the forward-applicable include adjustment is:

```cpp
// Required when introducing the substitution rule into a translation unit
#include <memory>
```

Adding `<memory>` is a header-only include and incurs no runtime cost. It will be added at the moment a `make_unique` or `make_shared` call site is introduced; until then, no include adjustment is in scope.

### 0.7.4 Import Transformation Rules (forward-applicable)

If a future change introduces dependency replacement, the platform applies the following deterministic transformation rules to every importing file:

| From | To | Apply To |
|------|----|----------|
| `#include <legacy_alloc.h>` | `#include <memory>` | All `*.cpp`/`*.cc`/`*.cxx`/`*.h`/`*.hpp` files using the legacy header |
| `boost::make_unique` | `std::make_unique` | All translation units once C++14+ is confirmed |
| `boost::shared_ptr` | `std::shared_ptr` | All translation units once C++11+ is confirmed |
| Direct use of removed dependency identifiers | Equivalent identifier from the secure replacement | All files that import the removed dependency |

These rules do not apply in the active scope and are recorded for forward defense only.

## 0.8 Impact Analysis and Testing Strategy

### 0.8.1 Security Testing Requirements

Because the active scope produces zero edits, the testing obligation collapses to a **regression-style audit re-run**: the ten-family pattern scan that established the zero-finding baseline must continue to return zero matches after any future commit that touches this repository.

#### 0.8.1.1 Vulnerability Regression Tests

The platform defines the following regression contract for the active codebase:

| Test | Pass Criterion |
|------|----------------|
| Re-run of the ten-family pattern scan against `src/` and `tests/` | Every category returns zero matches |
| Distinct-line inventory | Remains 35,141 across the four documented idioms (or grows only with additions that match the same idioms) |
| File-presence check | Existing `src/` and `tests/` files retained; `README.md` and `LICENSE/LICENSE.txt` retained |

If C/C++ source were later introduced, the regression contract is extended with:

| Test | Pass Criterion |
|------|----------------|
| `clang-tidy` with `cppcoreguidelines-owning-memory` | Zero diagnostics |
| `clang-tidy` with `cppcoreguidelines-no-malloc` | Zero diagnostics |
| `clang-tidy` with `modernize-make-unique`, `modernize-make-shared` | Zero diagnostics |
| AddressSanitizer + LeakSanitizer instrumented run | Zero leak/use-after-free/double-free reports |
| Targeted unit tests for ownership transfer | All pass |

#### 0.8.1.2 Security-Specific Test Cases

For the active scope, no new security test cases are required because no defect was identified to regress against. Forward-applicable test-file templates the platform commits to creating at the moment a corresponding defect is introduced:

- `tests/security/test_<vulnerability>_fix.<ext>` — Verifies the specific CWE/CVE is resolved
- `tests/security/test_ownership_invariants.<ext>` — Verifies that the rule's substitution holds at every construction site (e.g., that no raw `new` for owning pointers exists)
- `tests/integration/test_lifetime_correctness.<ext>` — Verifies destructor-driven release at scope exit, including exception paths

#### 0.8.1.3 Existing-Test Verification

The repository's existing test files (`tests/integration/file_10.js`, `file_21.js`; `tests/unit/file_9.js`, `file_20.js`) follow the same arithmetic-function idiom as the source files; they have no security-relevant behavior. They are nonetheless preserved to avoid scope creep.

### 0.8.2 Verification Methods

#### 0.8.2.1 Automated Security Scanning

| Tool | Active Scope | Forward-Applicable Trigger |
|------|--------------|-----------------------------|
| `npm audit` / `pip-audit` / `cargo audit` / `osv-scanner` | Not applicable — no manifest exists | Activates when any manifest is added |
| `semgrep` / `CodeQL` | Optional — substitutes for the per-family `grep` baseline if richer query semantics are needed | Recommended when configuration files or CI workflows are added |
| `clang-tidy` | Not applicable — no C/C++ source exists | Activates immediately upon introduction of any `*.cpp`/`*.h` file |
| `clang -fsanitize=address,leak,undefined` | Not applicable | Activates with the introduction of a build target |
| Repository pattern-scan baseline (the 10-family `grep -RInE` set) | **Active and authoritative** | Continues to apply |

Expected result for the active scope: every scanner that can be run today (the pattern-scan baseline) reports zero findings.

#### 0.8.2.2 Manual Verification Steps

For the active scope:

- Re-run each of the ten `grep -RInE '<pattern>' src tests` commands documented in 0.3.1 and confirm the match count is zero.
- Compare directory listing against the file inventory in 0.3.1 to confirm no files were added or removed outside the documented set.
- Spot-check one representative file per directory to confirm the four idioms remain the only content present.

For forward-applicable C++ assets:

- Build with `-Wall -Wextra -Werror -fsanitize=address,leak,undefined` and run the test suite under sanitizers.
- Run `clang-tidy --checks='cppcoreguidelines-owning-memory,cppcoreguidelines-no-malloc,modernize-make-unique,modernize-make-shared' --warnings-as-errors='*'`.
- Verify each modified call site in code review against the substitution recipe in 0.5.1.2.

#### 0.8.2.3 Penetration-Testing Scenarios

No penetration-testing scenarios apply to the active scope: the codebase has no public-facing surface, no I/O, no parsing path, no authentication, and no privileged operations. The standard categories (authentication bypass, authorization bypass, injection, deserialization gadget chains, SSRF, RCE, DoS) are inapplicable.

### 0.8.3 Impact Assessment

#### 0.8.3.1 Direct Security Improvements Achieved

| Improvement | Status |
|-------------|--------|
| Latent vulnerabilities eliminated | None — zero were present to eliminate |
| Authoritative audit trail produced | Yes — the 10-family scan and 30-file `REFERENCE` table provide demonstrable coverage |
| Rule captured and ready for enforcement | Yes — see 0.10 |
| Forward-applicable substitution policy recorded | Yes — see 0.5 and 0.6 |

#### 0.8.3.2 Side Effects on Existing Functionality

| Concern | Outcome |
|---------|---------|
| Public APIs | Unchanged — no edits in the active scope |
| Internal modules | Unchanged |
| Behavior of the `mod_N_M(x)` arithmetic functions | Unchanged — every result is bit-for-bit identical to the pre-audit baseline |
| Test results | Unchanged |
| Build artifacts | Unchanged — there is no build system to perturb |

#### 0.8.3.3 Performance Impact

The user's "do ensure the performance of the code is not degraded" constraint is **trivially satisfied** in the active scope because the diff is empty: by construction every performance metric is identical to the pre-audit baseline.

For forward-applicable substitutions:

| Substitution | Performance Impact |
|--------------|---------------------|
| `T* p = new T(args)` → `auto p = std::make_unique<T>(args)` | Zero runtime overhead vs. raw `new` on every modern toolchain; identical heap allocation; destructor inlined |
| `std::shared_ptr<T>(new T(args))` → `std::make_shared<T>(args)` | **Strictly better** — single heap allocation for both the data block and the control block, eliminating one `operator new` call and improving locality |
| `T* p = new T[N]` → `std::make_unique<T[]>(N)` | Zero overhead; equivalent allocation pattern |

The performance contract is therefore preserved both for the present zero-edit diff and for all forward-applicable substitutions the rule prescribes.

#### 0.8.3.4 Potential Impacts to Address

| Potential Impact | Status / Mitigation |
|-------------------|---------------------|
| Behavioral regression | Not possible — empty diff cannot introduce regression |
| Build breakage | Not possible — there is no build to break |
| Test failure | Not possible — empty diff |
| Documentation drift | Mitigated — this AAP is the authoritative documentation for the audit and the rule |

## 0.9 Scope Boundaries

### 0.9.1 Exhaustively In Scope

The following files and patterns are **in scope** for the security audit. Every entry was inspected during context-gathering. The list intentionally enumerates the present corpus exhaustively rather than relying on wildcards alone, so no file is left as "to be discovered".

#### 0.9.1.1 Source Files (audited; zero findings)

```
src/config/file_6.js
src/config/file_17.js
src/controllers/file_0.js
src/controllers/file_11.js
src/controllers/file_22.js
src/domain/file_8.js
src/domain/file_19.js
src/middleware/file_5.js
src/middleware/file_16.js
src/middleware/file_27.js
src/models/file_2.js
src/models/file_13.js
src/models/file_24.js
src/repositories/file_7.js
src/repositories/file_18.js
src/routes/file_3.js
src/routes/file_14.js
src/routes/file_25.js
src/services/file_1.js
src/services/file_12.js
src/services/file_23.js
src/utils/file_4.js
src/utils/file_15.js
src/utils/file_26.js
src/utils/filler.js
tests/integration/file_10.js
tests/integration/file_21.js
tests/unit/file_9.js
tests/unit/file_20.js
README.md
LICENSE/LICENSE.txt
```

#### 0.9.1.2 Pattern Globs (forward-applicable)

The following globs define the platform's standing in-scope policy. They are the same patterns that drove the audit and that future regression scans must continue to cover.

- Vulnerable dependency manifests:
    - `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `npm-shrinkwrap.json`
    - `requirements.txt`, `Pipfile`, `Pipfile.lock`, `pyproject.toml`, `poetry.lock`, `setup.py`
    - `pom.xml`, `build.gradle`, `build.gradle.kts`
    - `Cargo.toml`, `Cargo.lock`
    - `go.mod`, `go.sum`
    - `Gemfile`, `Gemfile.lock`, `composer.json`, `composer.lock`
    - `vcpkg.json`, `conanfile.txt`, `conanfile.py`, `CMakeLists.txt`
- Source files containing rule-targeted patterns:
    - `**/*.cpp`, `**/*.cc`, `**/*.cxx`, `**/*.c`, `**/*.h`, `**/*.hpp`, `**/*.hxx` (any C/C++ source/header)
    - `src/**/*.js`, `src/**/*.ts`, `src/**/*.mjs`, `src/**/*.cjs` (any JavaScript/TypeScript source)
    - `tests/**/*.js`, `tests/**/*.ts`, `tests/**/*.mjs`, `tests/**/*.cjs`
- Configuration files requiring security review:
    - `**/*.config.*`, `**/config/*.*`, `**/*.env*`, `**/secrets/*`
    - `**/*.yaml`, `**/*.yml`, `**/*.json` (security-relevant)
    - `**/*security*.config.*`
- Infrastructure and deployment:
    - `Dockerfile*`, `docker-compose*.yml`, `.dockerignore`
    - `.github/workflows/*.yml`, `.gitlab-ci.yml`, `.circleci/*`, `Jenkinsfile`
    - `kubernetes/*.yaml`, `helm/**/*.yaml`
- Security test files:
    - `tests/security/**/*.*`
    - `tests/**/test_*security*.*`, `tests/**/*security*.test.*`
- Documentation related to security:
    - `SECURITY.md`, `README.md` (security section)
    - `docs/security/**/*.md`
- Rule-mandated lint/CI files (forward-applicable; created only when the rule has a valid enforcement site):
    - `.clang-tidy` enabling `cppcoreguidelines-owning-memory`, `cppcoreguidelines-no-malloc`, `modernize-make-unique`, `modernize-make-shared`

### 0.9.2 Explicitly Out of Scope

The following items are **out of scope** for this audit and remediation. They are excluded either by the user's "minimal change" preference, by the security-fix discipline of this AAP flavor, or by the absence of any defect requiring them.

- Feature additions unrelated to security
- Performance optimizations not required for security (the existing arithmetic-function performance is a non-issue and explicitly preserved)
- Code refactoring beyond the security-fix substitution recipe (e.g., reorganizing the `src/{controllers,services,...}` hierarchy)
- Non-vulnerable dependencies (none exist; this would be moot even if it applied)
- Style or formatting changes to the existing JavaScript files
- Test files unrelated to security validation (the existing arithmetic-test files are preserved as-is)
- Edits to `src/utils/filler.js` filler comments
- Edits to `LICENSE/LICENSE.txt` or `README.md` content (preserved verbatim)
- Edits to the `mod_N_M(x)` arithmetic-function bodies (semantics preserved exactly)
- Edits to the unused `const store = []` declarations (these are not a security issue and are out of the minimal-change scope)
- Creation of `package.json`, `Dockerfile`, CI workflows, or any other manifest the repository does not already contain (creating these would expand scope beyond a security fix)
- Creation of `.clang-tidy` or other C++ tooling configurations in a JavaScript-only repository (the rule has no enforcement site here, so the tooling would be dead configuration)
- Adoption of any new runtime, framework, or library
- Migration of the existing JavaScript files to TypeScript or to any other language
- Any directive that the user did not explicitly authorize

## 0.10 Execution Parameters and Special Instructions

### 0.10.1 Security Verification Commands

The platform commits to the following exact commands as the operational verification surface for this audit. Each is reproducible from the repository root.

#### 0.10.1.1 Active-Scope Commands

Repository-wide ten-family vulnerability re-scan (must continue to return zero matches):

```bash
grep -RInE '\bnew\s+\w|\bdelete\s+\w|\bmalloc\(|\bfree\(|\bcalloc\(|\brealloc\(' src tests
grep -RInE '\beval\(|\bFunction\(|child_process|\bspawn\(|\bexec\(|\bquery\(' src tests
grep -RInE 'innerHTML|outerHTML|document\.write|dangerouslySetInnerHTML|insertAdjacentHTML' src tests
grep -RInE 'JSON\.parse|JSON\.stringify|YAML\.|\bloadAll\(|\bunserialize\(' src tests
grep -RInE '\bfs\.|\bpath\.|\bprocess\.|\bhttp\.|\bhttps\.|\bnet\.|\bdns\.|\btls\.|\bcrypto\.|\bos\.|\bcluster\.|\bdgram\.' src tests
grep -RInEi 'password|secret|api_key|token|jwt|bearer|credential|aws_|database_url|mongodb|postgres|redis' src tests
grep -RInE 'createCipher|createDecipher|createHash|MD5|SHA1|RC4|\bDES\b|3DES|Math\.random' src tests
grep -RInE '\brequire\(|\bimport\b|module\.exports|\bexports\.|\bglobal\.|globalThis|\bwindow\.|\bself\.' src tests
grep -RInE '__proto__|prototype\[|Object\.assign\(.*req|merge\(.*req|extend\(.*req' src tests
grep -RInE '\bclass\b|constructor|\bBuffer\.|new Buffer|\bPromise\.|\basync\b|\bawait\b' src tests
```

File-inventory regression check:

```bash
find . -type f \( -name '*.js' -o -name '*.ts' -o -name '*.cpp' -o -name '*.h' \
                 -o -name '*.hpp' -o -name '*.cc' -o -name '*.c' \) | sort
```

Dependency-manifest absence check (must continue to return no results):

```bash
find . -type f \( -name 'package.json' -o -name 'package-lock.json' \
                 -o -name 'requirements.txt' -o -name 'Pipfile*' \
                 -o -name 'pom.xml' -o -name 'go.mod' -o -name 'Cargo.toml' \
                 -o -name 'CMakeLists.txt' -o -name 'Dockerfile*' \
                 -o -name '*.yml' -o -name '*.yaml' \)
```

#### 0.10.1.2 Forward-Applicable Commands (activate when triggers appear)

```bash
# Dependency vulnerability scans (run when the corresponding manifest is introduced)

npm audit --production
pip-audit --requirement requirements.txt
cargo audit
osv-scanner --recursive .

#### C++ static analysis (run when any *.cpp/*.h/*.cc file is introduced)

clang-tidy --checks='cppcoreguidelines-owning-memory,cppcoreguidelines-no-malloc,modernize-make-unique,modernize-make-shared,cppcoreguidelines-pro-type-reinterpret-cast' \
           --warnings-as-errors='*'

#### Sanitizer-instrumented build/test (run when a build target is introduced)

g++ -std=c++17 -O1 -g -fsanitize=address,leak,undefined -fno-omit-frame-pointer
```

### 0.10.2 Research Documentation

The platform's research consulted the following authoritative frameworks at the framework level (no external content reproduced). These are the canonical references for both the user-supplied rule and the broader audit posture:

| Framework | Relevance |
|-----------|-----------|
| ISO C++ Core Guidelines (Stroustrup & Sutter) | R.10 (avoid `malloc`/`free`); R.11 (avoid explicit `new`/`delete`); R.20 (use `unique_ptr`/`shared_ptr` for ownership); R.22 (`make_shared`); R.23 (`make_unique`) |
| CERT C++ Secure Coding Standard (CMU SEI) | MEM50-CPP, MEM51-CPP, MEM52-CPP — proper allocation/deallocation discipline |
| CWE / MITRE Common Weakness Enumeration | CWE-401, CWE-415, CWE-416, CWE-457, CWE-762 (memory-management defects); CWE-78/89/79/352/502/22/284/798/327/1321/1104/16 (broader audit) |
| OWASP Top 10 / OWASP ASVS / OWASP Cheat Sheet Series | Application-layer audit framing for the non-memory-safety classes |

### 0.10.3 Implementation Constraints

| Constraint | Position |
|------------|----------|
| Priority | Security fix first; minimal disruption second |
| Backward compatibility | Must be maintained — no breaking changes to public surface |
| Deployment considerations | None for the active scope (no build artifacts produced); future deployments must coordinate any sanitizer-instrumented build flags only in non-production |
| Performance regression tolerance | Zero — verified by the empty diff; future substitutions held to the same bar |
| Behavioral change tolerance | Zero — the four-idiom corpus is preserved exactly |
| New runtime dependencies tolerance | Zero — no manifest is created, no library is added |
| New build steps tolerance | Zero — the repository's "no build system" property is preserved |
| License preservation | The MIT `LICENSE/LICENSE.txt` is preserved verbatim |

### 0.10.4 Special Instructions for Security Fixes

The platform records the following special instructions, derived directly from the user's input and the supplied rule:

#### 0.10.4.1 Verbatim User Directives

- **User Example (verbatim)**: "Scan the code and fix teh security vulnerabilites in the code. While fixing do ensure the performance of the code is not degraded."
- **User Rule (verbatim)**: "Never use new/delete directly - use std::make_unique/std::make_shared" (rule name: "Security vulnerabilities")

#### 0.10.4.2 Derived Directives

- **Change scope**: ONLY make changes necessary for security fixes; do not refactor unrelated code.
- **Dependency policy**: Do not update non-vulnerable dependencies (and in this repository, do not introduce any dependencies — none exist).
- **Functionality preservation**: Preserve all existing functionality except where it enables a vulnerability (no functionality enables any vulnerability in the present corpus, so all functionality is preserved).
- **Least privilege**: Follow the principle of least privilege in all changes (forward-applicable).
- **Audit trail**: Maintain a clear audit trail for any security-related change; the present AAP serves as that trail for this work item.
- **Documentation alignment**: Update security documentation alongside code changes (this AAP and `SECURITY.md` if/when introduced).
- **Compliance posture**: Ensure remediations meet C++ Core Guidelines, CERT C++ MEM, and CWE/OWASP authoritative guidance.
- **Breaking-change discipline**: If a fix would break backward compatibility for security reasons, the rationale is recorded in 0.5 with the trade-off explicitly justified; **no such break is required in the active scope**.
- **Performance contract**: "Ensure the performance of the code is not degraded" — trivially satisfied in the active scope (empty diff); for forward-applicable substitutions, satisfied by the equivalence/strict-improvement properties of `std::make_unique` and `std::make_shared` as documented in 0.5 and 0.8.

#### 0.10.4.3 Rule Capture and Applicability

The user's rule is captured verbatim and is operationalized as follows:

```text
Rule name:    Security vulnerabilities
Rule content: Never use new/delete directly - use std::make_unique/std::make_shared
```

| Aspect | Position |
|--------|----------|
| Target language | C++ (and C/C++ mixed translation units) |
| Target patterns | `T* p = new T(args)`, `T* p = new T[N]`, `delete p`, `delete[] p` |
| Required substitutions | `auto p = std::make_unique<T>(args)` (unique ownership); `auto p = std::make_shared<T>(args)` (shared ownership only when genuinely required); `auto p = std::make_unique<T[]>(N)` (array form) |
| CWE classes preempted | CWE-401, CWE-415, CWE-416, CWE-457, CWE-762 |
| Authoritative basis | C++ Core Guidelines R.10/R.11/R.20/R.22/R.23; CERT C++ MEM50-CPP / MEM51-CPP / MEM52-CPP |
| Header requirement at substitution sites | `#include <memory>` |
| Enforcement tooling | `clang-tidy` checks: `cppcoreguidelines-owning-memory`, `cppcoreguidelines-no-malloc`, `modernize-make-unique`, `modernize-make-shared` |
| **Applicability to this repository** | **Inapplicable in the active scope** — the repository contains zero C/C++ source/header files; the rule has no valid enforcement site to act on |
| **Forward applicability** | **Active and authoritative** — if any C/C++ file is later introduced, the rule applies immediately and unconditionally to every owning-pointer construction site in that file |

Illustrative substitution example (canonical, for reviewer reference):

```cpp
// non-compliant (raw ownership; CWE-401/415/416 risk surface)
Widget* w = new Widget(args);
// ... use w ...
delete w;

// compliant (unique ownership)
auto w = std::make_unique<Widget>(args);
// ... use w ...
// no explicit delete — destructor releases at scope exit

// compliant (shared ownership, only when truly required)
auto w = std::make_shared<Widget>(args);
```

#### 0.10.4.4 Resolved Conflicts

The platform encountered four conflicts during analysis and resolved each as follows. The resolutions are recorded so reviewers can audit the reasoning rather than only the outcome.

| Conflict | Resolution |
|----------|------------|
| Rule targets C++; repository is JavaScript-only | Capture rule verbatim; flag inapplicability; record forward-applicable enforcement; create no C++ tooling configuration in the active scope (would be dead configuration) |
| User asked to "fix vulnerabilities" but the audit produced zero findings | Honestly document the zero finding with reproducible evidence; preserve the AAP's full structure so the audit posture and forward-applicable policy remain authoritative |
| Tech-spec sections 1.1 / 1.3 / 6.4 describe an upstream platform unrelated to this repository | Do not cite those sections as authoritative for this AAP; build the AAP exclusively from the actual repository contents |
| "Ensure performance is not degraded" with a substitution rule that could nominally affect performance | Show that smart-pointer substitution is zero-overhead vs. raw `new` (and strictly better in the `make_shared` case), so the performance contract is preserved both for the active empty diff and for forward-applicable substitutions |

#### 0.10.4.5 Compliance and Acceptance Criteria

The audit work item is considered complete when:

- The ten-family pattern scan documented in 0.10.1.1 returns zero matches (current state).
- The file inventory in 0.9.1.1 is unchanged.
- The user-supplied rule is captured verbatim in this section (above).
- This AAP is approved as the authoritative audit trail.

The audit work item must be revisited when any of the following triggers fires:

- A new C/C++ source/header file is added to the repository.
- A dependency manifest of any kind is added.
- A configuration file, Dockerfile, or CI workflow is added.
- The corpus's four-idiom invariant is broken by content that does not match an existing idiom.

