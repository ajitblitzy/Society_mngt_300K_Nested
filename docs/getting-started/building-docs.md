# Building the Docs & PDF

This guide explains how to install the documentation toolchain and build the complete documentation set, including the single consolidated PDF deliverable, `Society-Management-Documentation.pdf`.

## Prerequisites

- **Node.js** — the toolchain targets Node.js (the `package.json` `engines` field requests `node >= 22`; the build scripts are plain CommonJS/ESM helpers and run on current LTS releases).
- **npm** — bundled with Node.js; used to install the dev-only toolchain and to run the build scripts.

No database, native binary, or running service is required: the project is documentation-only and the codebase is synthetic (see [Overview](overview.md)).

## Install the toolchain

From the repository root:

```bash
npm install
```

This installs the dev-dependencies declared in `package.json`:

| Package | Version | Role in the build |
| --- | --- | --- |
| `jsdoc` | 4.0.5 | Parses JSDoc annotations across all functions. |
| `jsdoc-to-markdown` | 9.1.3 | Renders per-identity Markdown API tables (`jsdoc2md`). |
| `@mermaid-js/mermaid-cli` | 11.15.0 | Renders Mermaid diagrams to SVG (`mmdc`). |
| `md-to-pdf` | 5.2.5 | Concatenates the ordered Markdown into the consolidated PDF. |

## Build commands

The `package.json` exposes four scripts. The single entry point is `docs:build`, which runs the three stages in order.

| Command | What it does |
| --- | --- |
| `npm run docs:api` | Runs `scripts/docs-api.js` → `jsdoc2md` over `src/**/*.js` and `tests/**/*.js`, writing a per-identity API table to `docs/api-reference/<layer>/mod_N.md`. |
| `npm run docs:diagrams` | Runs `scripts/docs-diagrams.js` → `mmdc`, rendering every `*.mmd` Mermaid source under `docs/` to `docs/assets/diagrams/<name>.svg`. |
| `npm run docs:pdf` | Runs `scripts/docs-pdf.js` → `md-to-pdf`, concatenating the ordered Markdown listed in `pdf.config.json` into `docs/Society-Management-Documentation.pdf`. |
| `npm run docs:build` | Orchestrates `docs:api` → `docs:diagrams` → `docs:pdf`, in that strict order. |

To build everything in one step:

```bash
npm run docs:build
```

## What the build produces

- **Per-identity API pages** — `docs/api-reference/**/mod_*.md`, one per module identity, each containing a generated table of that module's functions.
- **Rendered diagrams** — `docs/assets/diagrams/*.svg`, regenerated on every build from the authored `*.mmd` sources. (This directory is a build artifact and is git-ignored.)
- **The consolidated PDF** — `docs/Society-Management-Documentation.pdf`, the single deliverable assembled from the full Markdown corpus in the fixed order defined by `pdf.config.json`.

## Build order and rationale

The order is significant and is enforced by `docs:build`:

1. `docs:api` must run first so the per-identity API tables exist before assembly.
2. `docs:diagrams` must run before `docs:pdf` so the SVG diagrams exist on disk when the PDF renderer embeds them.
3. `docs:pdf` runs last, concatenating every Markdown page (including the generated API pages) into the PDF.

For a deeper explanation of the Markdown → PDF stage, see [PDF Export](../guides/pdf-export.md). For the JSDoc convention that feeds `docs:api`, see [JSDoc Conventions](../guides/jsdoc-conventions.md).
