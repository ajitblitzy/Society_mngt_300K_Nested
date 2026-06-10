# Documentation Assets — Generated Diagrams

This directory holds **generated** visual assets for the Society Management documentation — specifically Mermaid diagrams that are pre-rendered to SVG so they embed reliably when the Markdown corpus is concatenated into the consolidated PDF. It is a **build-output location, not hand-authored artwork**: the rendered images here are produced by the documentation build, not drawn by hand.

> **This README is the only hand-authored file in `docs/assets/`.** The documentation corpus — overview, architecture, API reference, and guides — lives elsewhere under `docs/`. Do **not** place authored Markdown pages in `docs/assets/`; this directory is for generated assets (plus this single explainer).

## Directory layout

```
docs/assets/
├── README.md          # this explainer (hand-authored; tracked)
├── diagrams-src/      # authored Mermaid sources (*.mmd) — tracked; inputs to mmdc
└── diagrams/          # rendered *.svg output from mmdc — generated; gitignored
```

## How it is populated

Running `npm run docs:diagrams` (part of the full `npm run docs:build`) invokes **`mmdc`**, the CLI from `@mermaid-js/mermaid-cli`, to render each Mermaid source under `diagrams-src/` into a matching SVG under `diagrams/`. Each rendered file keeps its source's base name (for example, `repo-structure.mmd` → `repo-structure.svg`).

Three diagrams are produced. Each is shown in the documentation page linked below, alongside its Mermaid source and the SVG it renders to:

| Diagram | Shown in | Mermaid source | Rendered SVG |
| --- | --- | --- | --- |
| Repository / layer structure | [`../architecture/overview.md`](../architecture/overview.md) | `diagrams-src/repo-structure.mmd` | `diagrams/repo-structure.svg` |
| Per-layer module grouping | [`../api-reference/index.md`](../api-reference/index.md) | `diagrams-src/module-grouping.mmd` | `diagrams/module-grouping.svg` |
| Documentation build → PDF pipeline | [`../guides/pdf-export.md`](../guides/pdf-export.md) | `diagrams-src/build-pipeline.mmd` | `diagrams/build-pipeline.svg` |

To change a diagram, edit its `*.mmd` source under `diagrams-src/` (these sources are tracked) and rebuild — never edit a generated `.svg` directly, since it is overwritten on the next build.

## Generated & gitignored

> **The `diagrams/` directory is git-ignored.** Its `.svg` files are regenerated on every build, so they are **not committed**. Do **not** hand-create or commit `.svg` files here — `mmdc` produces them at build time.

Because `diagrams/` is ignored (with no negation entry), even a `.gitkeep` placed inside it would not be tracked. The directory is therefore intentionally absent from version control and is recreated by `mmdc` on demand during the build, so an empty or missing `diagrams/` folder is expected — it is produced by the build, not missing content. The tracked anchors that keep `docs/assets/` itself in version control are **this README** and the authored sources under **`diagrams-src/`**.

## Regeneration & consistency

Because the diagrams are regenerated from their authored `*.mmd` sources on every build, they stay in sync with the verified project structure — 28 module identities (`mod_0`…`mod_27`) across 11 layers, sharing the codebase's uniform synthetic contract. See [`../guides/pdf-export.md`](../guides/pdf-export.md) for the full build → PDF pipeline, and [`../getting-started/building-docs.md`](../getting-started/building-docs.md) for prerequisites and the command reference.
