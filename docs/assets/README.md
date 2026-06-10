# Documentation Assets — Generated Diagrams

This directory holds **generated** visual assets for the Society Management documentation — specifically the Mermaid diagrams that are pre-rendered to SVG so they embed reliably when the Markdown corpus is concatenated into the consolidated PDF. It is a **build-output location, not hand-authored artwork**: the rendered images here are produced by the documentation build, not drawn by hand.

> **This README is the only hand-authored file in `docs/assets/`.** The documentation corpus — overview, architecture, API reference, and guides — lives elsewhere under `docs/`. Do **not** place authored Markdown pages in `docs/assets/`; this directory is for generated assets (plus this single explainer).

## Directory layout

```text
docs/assets/
├── README.md          # this explainer (hand-authored; tracked)
└── diagrams/          # rendered *.svg output from mmdc — generated & committed
    ├── .gitkeep              # placeholder anchor so the directory exists in git
    ├── structure.svg         # repository / layer structure (committed deliverable)
    ├── module-grouping.svg   # per-layer module grouping (committed deliverable)
    └── build-pipeline.svg    # documentation build → PDF pipeline (committed deliverable)
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

## Generated & committed — with a tracked directory anchor

> **The three rendered `.svg` files in `diagrams/` are committed deliverables.** `mmdc` regenerates them on every build, and the refreshed output is committed so the consolidated PDF embeds them and the Markdown link-check resolves against them. Do **not** hand-draw or hand-edit them — they are overwritten on the next build; to change a diagram, edit the `mermaid` block in its source page (see above) and rebuild.

The repository's [`.gitignore`](../../.gitignore) ignores the directory's *contents* (`docs/assets/diagrams/*`) by default, then re-includes the canonical deliverables with explicit negations — **`!.gitkeep`** plus **`!structure.svg`**, **`!module-grouping.svg`**, and **`!build-pipeline.svg`** — so those three rendered SVGs (and the `.gitkeep` directory anchor) stay tracked while any stray or intermediate output in the directory remains untracked. The tracked files under `docs/assets/` are therefore **this README**, **`diagrams/.gitkeep`**, and the **three committed diagram SVGs**.

## Regeneration & consistency

Because each diagram is regenerated from the `mermaid` block in its own documentation page on every build, the rendered SVGs stay in sync with the verified project structure — 28 module identities (`mod_0`…`mod_27`) across 11 layers, sharing the codebase's uniform synthetic contract. See [`../guides/pdf-export.md`](../guides/pdf-export.md) for the full build → PDF pipeline, and [`../getting-started/building-docs.md`](../getting-started/building-docs.md) for prerequisites and the command reference.
