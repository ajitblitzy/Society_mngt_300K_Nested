# Building the Docs & PDF

This guide explains how to install the documentation toolchain and build the complete documentation set, ending with the single consolidated PDF deliverable, `Society-Management-Documentation.pdf`.

## Prerequisites

- **Node.js `>= 22`** is required. The root `package.json` declares `"engines": { "node": ">=22" }`, so the toolchain and the build scripts run on Node.js 22 or newer.
- **npm** — bundled with Node.js; it installs the dev-only toolchain and runs the documentation build scripts.

No database, native binary, or running service is required: this is a documentation-only build, and the codebase it documents is synthetic (see [Overview](overview.md)).

## Install the toolchain

From the repository root:

```bash
npm install
```

This installs the dev-dependencies declared in `package.json`. The versions are **pinned exactly** (no `^` / `~` ranges and no `latest`), so the install is deterministic and the build is reproducible:

| Package | Pinned version | Role in the build |
| --- | --- | --- |
| `jsdoc` | `4.0.5` | Parses the JSDoc comments added to every function. |
| `jsdoc-to-markdown` | `9.1.3` | Provides the `jsdoc2md` CLI that generates the per-identity Markdown API tables. |
| `@mermaid-js/mermaid-cli` | `11.15.0` | Provides the `mmdc` CLI that renders the Mermaid diagrams to SVG. |
| `md-to-pdf` | `5.2.5` | Concatenates the ordered Markdown corpus into the single consolidated PDF. |

Equivalently, the four pinned specifiers are `jsdoc@4.0.5`, `jsdoc-to-markdown@9.1.3`, `@mermaid-js/mermaid-cli@11.15.0`, and `md-to-pdf@5.2.5`.

## Build scripts

`package.json` exposes exactly four scripts. The first three are the individual build stages; `docs:build` is the single entry point that runs them in strict order.

| Command | What it does |
| --- | --- |
| `npm run docs:api` | Runs `scripts/docs-api.js` → `jsdoc2md` over `src/**/*.js` and `tests/**/*.js` (configured by `jsdoc.json`, with `sourceType: "script"`), writing a per-identity API reference table into each `docs/api-reference/<layer>/mod_N.md` page. |
| `npm run docs:diagrams` | Runs `scripts/docs-diagrams.js` → `mmdc`, rendering the authored Mermaid diagrams to SVG under `../assets/diagrams/`. |
| `npm run docs:pdf` | Runs `scripts/docs-pdf.js` → `md-to-pdf` (configured by `pdf.config.json`), concatenating the ordered Markdown corpus into the consolidated `../Society-Management-Documentation.pdf`. |
| `npm run docs:build` | Orchestrates the three stages in the strict order `docs:api` → `docs:diagrams` → `docs:pdf`. |

When iterating, an individual stage can be run on its own:

```bash
npm run docs:api
npm run docs:diagrams
npm run docs:pdf
```

The order matters and is enforced by `docs:build`: `docs:api` must run first so the per-identity API tables exist, `docs:diagrams` must run before `docs:pdf` so the SVG diagrams are on disk when the PDF renderer embeds them, and `docs:pdf` runs last to assemble everything into the PDF.

## One-command build

`npm run docs:build` is the **single command that produces the consolidated PDF**, `../Society-Management-Documentation.pdf`:

```bash
npm run docs:build
```

This is the command that satisfies the requirement to *generate the PDF of the document after it is created*: the Markdown corpus is authored first, and `docs:build` then assembles it — generating the per-identity API tables, rendering the diagrams, and finally concatenating the ordered Markdown (as listed in `pdf.config.json`) into the one PDF deliverable.

## Offline / sandbox note

`npm install` is the only step that needs the network. An offline sandbox with no network access cannot fetch the toolchain, so `npm install` will not complete there. Because the four versions are pinned exactly in `package.json`, the install is deterministic in any environment that does have network access (or a warmed npm cache); once the toolchain is present, the entire build (`docs:api` → `docs:diagrams` → `docs:pdf`) runs locally with no further network access. For the Markdown → PDF stage in detail — including how to regenerate only the PDF from already-built inputs — see [PDF Export](../guides/pdf-export.md).

## See also

- [PDF Export](../guides/pdf-export.md) — the Markdown → PDF pipeline, assembly order, and page-layout settings.
- [JSDoc Conventions](../guides/jsdoc-conventions.md) — the JSDoc rule and convention that feed `docs:api`.
