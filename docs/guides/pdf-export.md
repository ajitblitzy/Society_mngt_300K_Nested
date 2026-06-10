# PDF Export

This guide explains how the consolidated PDF deliverable, `Society-Management-Documentation.pdf`, is produced from the authored Markdown corpus.

## The pipeline

The documentation build is a three-stage pipeline, orchestrated by `npm run docs:build`. The PDF is the final output of the last stage.

![Documentation build to PDF pipeline](docs/assets/diagrams/build-pipeline.svg)

*Diagram source: `docs/assets/diagrams-src/build-pipeline.mmd` (rendered to SVG by `npm run docs:diagrams`).*

1. **`docs:api`** — `scripts/docs-api.js` runs `jsdoc-to-markdown` over `src/**/*.js` and `tests/**/*.js`, writing a per-identity API table to `docs/api-reference/<layer>/mod_N.md`.
2. **`docs:diagrams`** — `scripts/docs-diagrams.js` runs `mmdc` to render every `*.mmd` Mermaid source under `docs/` to `docs/assets/diagrams/<name>.svg`, so the diagrams are available as images for embedding.
3. **`docs:pdf`** — `scripts/docs-pdf.js` reads the ordered `documents` list from `pdf.config.json`, concatenates those Markdown files in order (inserting a page break between each), and renders the assembled document into a single PDF with `md-to-pdf`.

## Build command

```bash
npm run docs:build
```

`docs:build` runs the three stages in the strict order above. To (re)generate only the PDF from already-built inputs:

```bash
npm run docs:pdf
```

## Assembly order

The PDF concatenates the corpus in the fixed order defined by the `documents` array in `pdf.config.json`:

1. `docs/index.md`
2. `docs/getting-started/` — `overview.md`, `project-structure.md`, `building-docs.md`
3. `docs/architecture/` — `overview.md`, `module-taxonomy.md`, `code-conventions.md`
4. `docs/api-reference/index.md`, then the 28 per-identity pages grouped by layer (controllers → services → models → routes → utils → middleware → config → repositories → domain → tests/unit → tests/integration)
5. `docs/guides/` — `jsdoc-conventions.md`, `pdf-export.md`

## Page layout

Layout is controlled by the `pdf_options` and `css` keys in `pdf.config.json`:

| Setting | Value |
| --- | --- |
| Page format | A4 |
| Margins | ~20 mm on all sides |
| Background graphics | enabled (`printBackground: true`) |
| Page breaks | a new page begins before each top-level heading (`h1`) |
| Tables | bordered, with header shading and zebra striping |
| Code highlighting | GitHub style |

Each authored Markdown page begins with a single top-level `#` heading, so every section starts on a fresh page in the PDF, and the generated per-identity pages each begin with their `# mod_N` heading.

## Output

The pipeline writes exactly one file:

```text
docs/Society-Management-Documentation.pdf
```

This PDF is the committed deliverable. (The intermediate `docs/assets/diagrams/*.svg` images are build artifacts and are git-ignored; the PDF itself is tracked.) For prerequisites and the full command reference, see [Building the Docs & PDF](../getting-started/building-docs.md).
