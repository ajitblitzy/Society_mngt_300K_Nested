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
			sections.push(fs.readFileSync(absolutePath, 'utf8').trimEnd());
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
