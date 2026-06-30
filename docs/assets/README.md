# Documentation Assets

This directory holds **generated** visual assets for the Society Management documentation —
specifically Mermaid diagrams pre-rendered to **SVG** so they embed reliably when the Markdown
corpus is concatenated into the consolidated PDF. It is a **build-output location, not
hand-authored artwork**: the diagrams are pre-rendered to SVG for the PDF by the documentation
build, and the only file authored by hand here is this README.

## Directory layout

```
docs/assets/
└── diagrams/        # Mermaid diagrams rendered to .svg by `mmdc` (generated; gitignored)
```

## How it is populated

Running `npm run docs:diagrams` (part of the full `npm run docs:build`) invokes `mmdc` — the CLI
from `@mermaid-js/mermaid-cli` — to render the authored Mermaid sources into
`docs/assets/diagrams/<name>.svg`. Three diagrams are produced; each is authored as a Mermaid block
inside an existing documentation page:

| Diagram | Authored in | Rendered output |
| --- | --- | --- |
| Repository / layer structure | [`../architecture/overview.md`](../architecture/overview.md) | `diagrams/structure.svg` |
| Per-layer module grouping | [`../api-reference/index.md`](../api-reference/index.md) | `diagrams/module-grouping.svg` |
| Documentation build → PDF pipeline | [`../guides/pdf-export.md`](../guides/pdf-export.md) | `diagrams/build-pipeline.svg` |

The `.svg` filenames above are illustrative of the rendered outputs.

## Generated and gitignored

> **The `diagrams/` directory is gitignored.** Its `.svg` contents are regenerated on every build,
> so the rendered files are **not committed** to version control.

- **Do not hand-create or commit `.svg` files** here — they are produced by `mmdc` at build time.
- The empty `diagrams/` directory is kept present via a tracked **`.gitkeep`** placeholder so the
  build always has a target; if a fresh checkout lacks it, the build (`mmdc`) recreates the directory.
- **Do not place authored Markdown documentation pages in `docs/assets/`** — this directory is for
  generated assets only, and this README is the sole explainer exception.

## Regeneration and consistency

Because the diagrams are regenerated from their authored Mermaid sources on each build, they stay in
sync with the verified project structure (28 module identities across 11 layers; a uniform synthetic
function contract). See [`../getting-started/building-docs.md`](../getting-started/building-docs.md)
to install the toolchain and run the build, and [`../guides/pdf-export.md`](../guides/pdf-export.md)
for the full documentation build → PDF pipeline.
