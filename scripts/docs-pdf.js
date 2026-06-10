#!/usr/bin/env node
/**
 * docs-pdf.js — Assemble the consolidated documentation PDF.
 *
 * Cross-platform implementation of the `docs:pdf` npm script and the assembly
 * layer that `pdf.config.json` was always designed to drive (see the file's
 * `documents[]` ordering key). It replaces the previous
 * `md-to-pdf --config-file pdf.config.json` invocation, which supplied **no**
 * Markdown input: `md-to-pdf` consumes Markdown files/stdin and a `dest`
 * destination, and does not read the custom `documents[]`/`output` keys. As a
 * result the old script could never assemble or emit the consolidated PDF.
 *
 * Behaviour (per AAP §0.5.5 / §0.9.1 and the CP1 review resolution):
 *   - Reads `pdf.config.json` for the canonical, ordered `documents[]` list and
 *     the destination (`dest`, with `output` accepted as a fallback alias).
 *   - Validates each document's existence in order. Missing documents are
 *     reported clearly and skipped so partial builds still succeed; the build
 *     only fails if no documents are present at all.
 *   - Concatenates the existing documents, in order, separated by an explicit
 *     page break so each top-level document starts on a fresh PDF page.
 *   - Strips fenced ```mermaid blocks from each page before rendering. `md-to-pdf`
 *     has no Mermaid support, so a fence would otherwise print as raw source text
 *     alongside the pre-rendered SVG that each diagram page embeds; the PDF must
 *     present the rendered diagram only (AAP §0.4.3 — diagrams are "pre-rendered
 *     to SVG ... for reliable PDF embedding"). The authored Markdown keeps its
 *     Mermaid source (the diagram source-of-truth for `docs:diagrams` and for
 *     native Markdown viewers); only the Markdown handed to `md-to-pdf` is stripped.
 *   - Renders the combined Markdown to a single PDF with `md-to-pdf`, passing the
 *     supported configuration keys (`pdf_options`, `css`, `document_title`,
 *     `highlight_style`) and writing to the configured `dest`.
 *
 * `md-to-pdf` 5.x is CommonJS and exposes `mdToPdf(input, config)`.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { mdToPdf } = require('md-to-pdf');

/** Repository root (npm runs the script with cwd at the package.json directory). */
const ROOT = process.cwd();

/** Path to the md-to-pdf / assembly configuration file. */
const CONFIG_PATH = path.join(ROOT, 'pdf.config.json');

/**
 * Explicit page break inserted between concatenated documents so each top-level
 * document begins on a new page in the rendered PDF.
 */
const PAGE_BREAK = '\n\n<div style="page-break-before: always;"></div>\n\n';

/**
 * Rewrite a single Markdown document's relative image paths so they remain valid
 * after every page is concatenated into one document and rendered from the
 * repository root.
 *
 * `md-to-pdf` serves `basedir` (set to the repository root by this script) over
 * a local HTTP server and resolves relative resource URLs against that root.
 * Authored pages reference diagrams relative to their OWN location (e.g.
 * `docs/architecture/overview.md` links `../assets/diagrams/structure.svg`), so
 * once the pages are concatenated those `../` paths no longer resolve against the
 * server root. Each Markdown image target is therefore resolved against its
 * source document's directory and re-expressed as a repository-root-relative,
 * forward-slash path (e.g. `docs/assets/diagrams/structure.svg`), which the file
 * server serves correctly so the rendered diagrams embed in the PDF. External
 * URLs (http/https/data/protocol-relative) and absolute paths are left untouched.
 *
 * Only image syntax (`![alt](target)`) is rewritten; ordinary links are left
 * as-is, since cross-document `.md` links are not resolvable resources in the
 * single concatenated PDF and rewriting them is unnecessary.
 *
 * @param {string} markdown - The source document's Markdown content.
 * @param {string} docDir - Absolute path to the source document's directory.
 * @returns {string} The Markdown with image targets rewritten root-relative.
 */
function rewriteImagePaths(markdown, docDir) {
	const IMAGE_RE = /(!\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g;
	const EXTERNAL_OR_ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|[a-zA-Z]:[\\/])/;
	return markdown.replace(IMAGE_RE, (match, open, url, close) => {
		if (EXTERNAL_OR_ABSOLUTE.test(url)) {
			return match;
		}
		const absolute = path.resolve(docDir, url);
		const rootRelative = path.relative(ROOT, absolute).split(path.sep).join('/');
		return `${open}${rootRelative}${close}`;
	});
}

/**
 * Strip fenced ```mermaid code blocks from a Markdown document.
 *
 * `md-to-pdf` renders Markdown with `marked`, which has no Mermaid support: a
 * ```mermaid fence is emitted as a literal `<pre><code>` block, so its raw source
 * (e.g. `graph TD ... --> ...` / `flowchart LR ...`) would appear in the rendered
 * PDF *in addition to* the pre-rendered SVG that each diagram page embeds on the
 * line immediately after the fence. The consolidated PDF is required to present
 * each diagram as the rendered image only (AAP §0.4.3 — diagrams are "pre-rendered
 * to SVG ... for reliable PDF embedding"), so the fenced Mermaid source is removed
 * from the Markdown before it is handed to `md-to-pdf`.
 *
 * This transformation is applied ONLY to the Markdown fed into the PDF. The
 * authored pages on disk are left unchanged and keep their ```mermaid source,
 * which remains the single source-of-truth that `docs:diagrams` extracts to render
 * each SVG and that native Markdown viewers (e.g. GitHub) render inline.
 *
 * Matching is intentionally narrow and robust:
 *   - Only fences whose info string is exactly `mermaid` are removed; other fenced
 *     code blocks (e.g. the ```javascript usage examples) are left untouched.
 *   - The closing fence must repeat the opening fence's backtick run (the `\1`
 *     backreference), so a shorter run elsewhere cannot prematurely close a block.
 *   - Both LF and CRLF (`\r?\n`) line endings are handled.
 *   - The trailing newline after the closing fence is consumed so no orphaned blank
 *     line is left behind.
 *   - The `![alt](diagram.svg)` image embed that follows each fence sits OUTSIDE the
 *     fence and is therefore preserved, so the rendered diagram still embeds.
 *
 * @param {string} markdown - The source document's Markdown content.
 * @returns {string} The Markdown with every fenced ```mermaid block removed.
 */
function stripMermaidBlocks(markdown) {
	const MERMAID_FENCE_RE = /^[ \t]*(`{3,})mermaid\b[^\r\n]*\r?\n[\s\S]*?\r?\n[ \t]*\1[ \t]*\r?\n?/gm;
	return markdown.replace(MERMAID_FENCE_RE, '');
}

/**
 * Load and validate the PDF assembly configuration.
 *
 * @returns {{documents: string[], dest: string, mdOptions: object}} Parsed config.
 */
function loadConfig() {
	if (!fs.existsSync(CONFIG_PATH)) {
		throw new Error(`Configuration file not found: ${CONFIG_PATH}`);
	}

	const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

	const documents = Array.isArray(config.documents) ? config.documents : [];
	if (documents.length === 0) {
		throw new Error('pdf.config.json must define a non-empty "documents" array.');
	}

	// `dest` is md-to-pdf's destination key; `output` is accepted as a fallback.
	const dest = config.dest || config.output;
	if (!dest) {
		throw new Error('pdf.config.json must define a "dest" (output) path.');
	}

	// Pass through only md-to-pdf-supported options; the orchestration-only keys
	// (`documents`, `dest`, `output`) are consumed here, not by md-to-pdf.
	const { documents: _documents, dest: _dest, output: _output, ...mdOptions } = config;

	return { documents, dest, mdOptions };
}

/**
 * Read and concatenate the ordered documents that exist on disk.
 *
 * @param {string[]} documents - Ordered, repository-relative document paths.
 * @returns {{content: string, included: string[], missing: string[]}} The
 *   combined Markdown plus the lists of included and missing documents.
 */
function assembleMarkdown(documents) {
	const included = [];
	const missing = [];
	const sections = [];

	for (const relativePath of documents) {
		const absolutePath = path.join(ROOT, relativePath);
		if (fs.existsSync(absolutePath)) {
			const raw = fs.readFileSync(absolutePath, 'utf8').trimEnd();
			// Two source-preserving transforms are applied before concatenation:
			//   1. Strip ```mermaid fenced blocks. `md-to-pdf` does not render
			//      Mermaid, so a fence would print as raw source text next to the
			//      pre-rendered SVG that each diagram page embeds — the PDF must show
			//      the rendered diagram only (AAP §0.4.3). The authored pages keep
			//      their Mermaid source on disk; only this PDF input is stripped.
			//   2. Rewrite each page's relative image paths to be repository-root
			//      relative so they still resolve against the md-to-pdf file server
			//      (rooted at `basedir`/ROOT) once all pages are concatenated.
			const prepared = rewriteImagePaths(
				stripMermaidBlocks(raw),
				path.dirname(absolutePath)
			);
			sections.push(prepared);
			included.push(relativePath);
		} else {
			missing.push(relativePath);
		}
	}

	return { content: sections.join(PAGE_BREAK), included, missing };
}

/**
 * Assemble and render the consolidated documentation PDF.
 *
 * @returns {Promise<void>} Resolves once the PDF has been written and verified.
 */
async function main() {
	const { documents, dest, mdOptions } = loadConfig();
	const { content, included, missing } = assembleMarkdown(documents);

	if (missing.length > 0) {
		console.warn(
			`docs:pdf — ${missing.length} of ${documents.length} document(s) not found ` +
				`and will be skipped:\n  - ${missing.join('\n  - ')}`
		);
	}

	if (included.length === 0) {
		throw new Error(
			'None of the documents listed in pdf.config.json exist; nothing to assemble.'
		);
	}

	const destPath = path.isAbsolute(dest) ? dest : path.join(ROOT, dest);
	fs.mkdirSync(path.dirname(destPath), { recursive: true });

	await mdToPdf(
		{ content },
		Object.assign({}, mdOptions, { dest: destPath, basedir: ROOT })
	);

	if (!fs.existsSync(destPath)) {
		throw new Error(`md-to-pdf did not produce the expected output at ${destPath}.`);
	}

	const bytes = fs.statSync(destPath).size;
	console.log(
		`docs:pdf complete — assembled ${included.length} of ${documents.length} document(s) into ` +
			`${path.relative(ROOT, destPath).split(path.sep).join('/')} (${bytes} bytes).`
	);
}

main().catch((error) => {
	console.error(`docs:pdf failed: ${error && error.stack ? error.stack : error}`);
	process.exit(1);
});
