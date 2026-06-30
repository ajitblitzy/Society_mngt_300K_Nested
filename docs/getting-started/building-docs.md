# Building the Documentation & PDF

This page explains how to install the documentation toolchain and run the build that turns the authored Markdown corpus under `docs/` into the single consolidated PDF deliverable, [`../Society-Management-Documentation.pdf`](../Society-Management-Documentation.pdf).

## Prerequisites

- **Node.js >= 22** — the root `package.json` declares `"engines": { "node": ">=22" }`, so the documentation toolchain must run on Node.js version 22 or newer. No other runtime is required; the entire build is driven by the npm scripts described below.

## Install the toolchain

Install the pinned dev-dependencies from the root `package.json`:

```bash
npm install
```

This installs the four-tool documentation toolchain at the **exact versions pinned** in `package.json` (no `^`/`~` ranges, so every environment installs identical versions): `jsdoc@4.0.5`, `jsdoc-to-markdown@9.1.3`, `@mermaid-js/mermaid-cli@11.15.0`, and `md-to-pdf@5.2.5`.

| Tool | Version | Role in the build |
| --- | --- | --- |
| `jsdoc` | `4.0.5` | Parses the JSDoc comments added to every function. |
| `jsdoc-to-markdown` | `9.1.3` | Provides the `jsdoc2md` CLI that generates the per-identity Markdown API reference tables. |
| `@mermaid-js/mermaid-cli` | `11.15.0` | Provides the `mmdc` CLI that renders the authored Mermaid diagrams to SVG. |
| `md-to-pdf` | `5.2.5` | Concatenates the ordered Markdown corpus into the single consolidated PDF. |

## Build scripts

The build is exposed as four npm scripts in the root `package.json`. The first three are the individual stages; `docs:build` runs all three in order.

| Script | Command | What it does |
| --- | --- | --- |
| `docs:api` | `npm run docs:api` | Runs `jsdoc2md` (configured by `jsdoc.json`, source globs `src/**/*.js` and `tests/**/*.js`, `sourceType: "script"`) to generate one API reference table per module identity and inject it into the matching page under `docs/api-reference/**/mod_*.md`, between that page's `<!-- docs:api:START -->` and `<!-- docs:api:END -->` markers. The script fails loudly (errors) if a target page or its markers are missing. |
| `docs:diagrams` | `npm run docs:diagrams` | Runs `mmdc` to render the authored Mermaid diagrams to SVG under [`../assets/diagrams/`](../assets/diagrams/) (i.e. `docs/assets/diagrams/`). |
| `docs:pdf` | `npm run docs:pdf` | Runs `md-to-pdf` using `pdf.config.json` to concatenate the ordered Markdown corpus into [`../Society-Management-Documentation.pdf`](../Society-Management-Documentation.pdf) (i.e. `docs/Society-Management-Documentation.pdf`). |
| `docs:build` | `npm run docs:build` | Orchestrates the three stages above **in strict order — `docs:api` → `docs:diagrams` → `docs:pdf`**. |

To run the stages individually:

```bash
npm run docs:api
npm run docs:diagrams
npm run docs:pdf
```

The order matters: `docs:api` must emit the API reference tables and `docs:diagrams` must render the diagrams **before** `docs:pdf` concatenates the corpus, because the PDF embeds the output of both earlier stages. `docs:build` enforces this `docs:api` → `docs:diagrams` → `docs:pdf` ordering for you.

## One-command build

`npm run docs:build` is the single command that produces the consolidated PDF. It generates the documentation first, then assembles it into [`../Society-Management-Documentation.pdf`](../Society-Management-Documentation.pdf):

```bash
npm run docs:build
```

This is the command that satisfies the requirement to generate the PDF after the document is created — the Markdown corpus is generated and rendered first, and the PDF is assembled last.

## Offline / sandbox note

An offline sandbox has **no network access**, so `npm install` cannot fetch the toolchain there. The toolchain versions are therefore **pinned exactly in `package.json`** so that any networked environment installs the identical, verified versions and the build is reproducible. For producing the PDF without network access, a documented offline fallback that yields the same deliverable is described in [`../guides/pdf-export.md`](../guides/pdf-export.md) — see that page for the procedure rather than repeating it here.

## See also

- [`../guides/pdf-export.md`](../guides/pdf-export.md) — the end-to-end build → PDF pipeline in detail, including the offline fallback.
- [`../guides/jsdoc-conventions.md`](../guides/jsdoc-conventions.md) — the JSDoc convention applied to every function, which feeds `docs:api`.
