# Documentation Assets — Generated Diagrams

This directory holds **generated** visual assets for the Society Management documentation — specifically the Mermaid diagrams that are pre-rendered to SVG so they embed reliably when the Markdown corpus is concatenated into the consolidated PDF. It is a **build-output location, not hand-authored artwork**: the rendered images here are produced by the documentation build, not drawn by hand.

> **This README is the only hand-authored file in `docs/assets/`.** The documentation corpus — overview, architecture, API reference, and guides — lives elsewhere under `docs/`. Do **not** place authored Markdown pages in `docs/assets/`; this directory is for generated assets (plus this single explainer).

## Directory layout

```text
docs/assets/
├── README.md          # this explainer (hand-authored; tracked)
└── diagrams/          # rendered *.svg output from mmdc — generated (gitignored)
    └── .gitkeep       # tracked placeholder anchor so the directory exists in git
```

There is **no `diagrams-src/` directory**. The source of each diagram is the fenced `mermaid` block authored **directly in its documentation page** — the Markdown pages are the single source of truth, so the diagrams stay co-located with the prose that explains them.

## How it is populated

Running `npm run docs:diagrams` (part of the full `npm run docs:build`) invokes **`mmdc`**, the CLI from `@mermaid-js/mermaid-cli`, via the cross-platform helper `scripts/docs-diagrams.js`. For each diagram, the helper extracts the `mermaid` block from its **source page** and renders it to a fixed SVG name under `diagrams/`.

Three diagrams are produced. Each is authored in — and rendered from — the documentation page shown below:

| Diagram | Source page (its `mermaid` block) | Rendered SVG |
| --- | --- | --- |
| Repository / layer structure | [`../architecture/overview.md`](../architecture/overview.md) | `diagrams/structure.svg` |
| Per-layer module grouping | [`../api-reference/index.md`](../api-reference/index.md) | `diagrams/module-grouping.svg` |
| Documentation build → PDF pipeline | [`../guides/pdf-export.md`](../guides/pdf-export.md) | `diagrams/build-pipeline.svg` |

To change a diagram, edit the `mermaid` block **in its source page** (`architecture/overview.md`, `api-reference/index.md`, or `guides/pdf-export.md`) and rebuild — never edit a generated `.svg` directly, since it is overwritten on the next build.

## Generated & gitignored — with a tracked placeholder

> **The rendered `.svg` files in `diagrams/` are git-ignored.** They are regenerated on every build, so they are **not committed**. Do **not** hand-create or commit `.svg` files here — `mmdc` produces them at build time.

The `diagrams/` directory itself is kept in version control by a single tracked placeholder, **`diagrams/.gitkeep`**. The repository's [`.gitignore`](../../.gitignore) ignores the directory's *contents* (`docs/assets/diagrams/*`) but re-includes the placeholder with a negation (`!docs/assets/diagrams/.gitkeep`), so the empty output directory exists in a fresh checkout while every rendered SVG stays untracked. The tracked anchors that keep `docs/assets/` in version control are therefore **this README** and **`diagrams/.gitkeep`**.

## Regeneration & consistency

Because each diagram is regenerated from the `mermaid` block in its own documentation page on every build, the rendered SVGs stay in sync with the verified project structure — 28 module identities (`mod_0`…`mod_27`) across 11 layers, sharing the codebase's uniform synthetic contract. See [`../guides/pdf-export.md`](../guides/pdf-export.md) for the full build → PDF pipeline, and [`../getting-started/building-docs.md`](../getting-started/building-docs.md) for prerequisites and the command reference.
