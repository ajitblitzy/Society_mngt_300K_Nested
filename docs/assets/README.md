# Documentation Assets

This directory holds the Mermaid **diagram sources** for the Society Management documentation and
the **generated** SVG renderings produced from them. The `.mmd` source files are tracked in version
control; the `.svg` files are build outputs — pre-rendered so they embed reliably when the Markdown
corpus is concatenated into the consolidated PDF — and are **not** committed. The only prose authored
by hand here is this README.

## Directory layout

```
docs/assets/
└── diagrams/        # *.mmd Mermaid sources (tracked) → *.svg renderings by `mmdc` (generated; gitignored)
```

## How it is populated

Running `npm run docs:diagrams` (part of the full `npm run docs:build`) invokes `mmdc` — the CLI
from `@mermaid-js/mermaid-cli` — which walks `docs/` for `*.mmd` files and renders each one to a
matching `docs/assets/diagrams/<name>.svg`. Three diagram sources live here, and each is also shown
inline as a fenced Mermaid block in the documentation page that discusses it:

| Diagram | Mermaid source (tracked) | Rendered output (generated) | Also shown inline in |
| --- | --- | --- | --- |
| Repository / layer structure | `diagrams/structure.mmd` | `diagrams/structure.svg` | [`../architecture/overview.md`](../architecture/overview.md) |
| Per-layer module grouping | `diagrams/module-grouping.mmd` | `diagrams/module-grouping.svg` | [`../api-reference/index.md`](../api-reference/index.md) |
| Documentation build → PDF pipeline | `diagrams/build-pipeline.mmd` | `diagrams/build-pipeline.svg` | [`../guides/pdf-export.md`](../guides/pdf-export.md) |

Because `mmdc` derives each output name from the source file name, `structure.mmd` produces
`structure.svg`, `module-grouping.mmd` produces `module-grouping.svg`, and `build-pipeline.mmd`
produces `build-pipeline.svg`.

## Tracked sources, generated SVGs

> **The `*.mmd` sources are committed; the `*.svg` renderings are gitignored.** The SVGs are
> regenerated on every build, so they are not stored in version control.

- **Edit diagrams in the `*.mmd` source files** (and keep the inline fenced Mermaid block on the
  corresponding page in sync); do **not** hand-create or commit `*.svg` files — they are produced by
  `mmdc` at build time.
- The `diagrams/` directory is kept present via a tracked **`.gitkeep`** placeholder so the build
  always has a target; the tracked `*.mmd` sources live alongside it.
- **Do not place authored Markdown documentation pages in `docs/assets/`** — this directory is for
  diagram sources and generated assets only, and this README is the sole explainer exception.

## Regeneration and consistency

Because the SVGs are regenerated from their `*.mmd` sources on each build, they stay in sync with the
verified project structure (28 module identities across 11 layers; a uniform synthetic function
contract). See [`../getting-started/building-docs.md`](../getting-started/building-docs.md) to install
the toolchain and run the build, and [`../guides/pdf-export.md`](../guides/pdf-export.md) for the full
documentation build → PDF pipeline.
