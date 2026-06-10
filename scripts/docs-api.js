#!/usr/bin/env node
/**
 * docs-api.js — Generate the per-identity API reference pages from JSDoc.
 *
 * Cross-platform implementation of the `docs:api` npm script. It replaces the
 * previous POSIX-only inline shell loop (`for f in ...; do ...; done`,
 * `$(basename ...)`, `${f%.js}`) — which failed on the Windows/PowerShell
 * target — with a portable Node helper that runs identically on Windows, macOS
 * and Linux.
 *
 * Behaviour (per AAP §0.4 / §0.5 and the CP1 review resolution):
 *   - Walks every JavaScript file under `src/` and `tests/`.
 *   - Reads each file's first-line header `// mod_N - society module` to derive
 *     the module identity. Files without a module header (e.g.
 *     `src/utils/filler.js`, header `// filler 298001`) are skipped — they are
 *     not module identities and must not produce an API page.
 *   - Renders the file's JSDoc to a Markdown API table with `jsdoc-to-markdown`.
 *   - Writes the result to the canonical per-layer path required by the AAP and
 *     `pdf.config.json`:
 *         src/<layer>/file_N.js  -> docs/api-reference/<layer>/mod_N.md
 *         tests/<sub>/file_N.js  -> docs/api-reference/tests/<sub>/mod_N.md
 *     (e.g. `src/controllers/file_0.js` -> `docs/api-reference/controllers/mod_0.md`).
 *
 * Robustness notes (why this is structured as a parent + per-file worker):
 *   - `jsdoc-to-markdown` 9.x is ESM-only, so it is loaded with a dynamic
 *     `import()` (this file is CommonJS).
 *   - Each module file is rendered in its OWN short-lived child process. Running
 *     many `render()` calls in a single long-lived process is unreliable here,
 *     so the parent re-invokes this same script in "worker" mode once per file.
 *   - The repository `jsdoc.json` sets `source.include: ["src", "tests"]`, which
 *     is correct for a whole-tree `jsdoc` run but would make a per-file render
 *     scan the entire 300k-line tree. The parent therefore derives a SCOPED
 *     JSDoc config (a copy of `jsdoc.json` with the `source` key removed, so
 *     `sourceType: "script"` and the other options are preserved) and the worker
 *     renders strictly the single `files` input — keeping each render to one
 *     module file.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

/** Repository root (the npm script runs with cwd at the package.json directory). */
const ROOT = process.cwd();

/** Source roots scanned for module-identity files. */
const SOURCE_ROOTS = ['src', 'tests'];

/** Repository JSDoc configuration (provides `sourceType: "script"`). */
const JSDOC_CONFIG = 'jsdoc.json';

/** Base output directory for the generated API reference pages. */
const API_REFERENCE_DIR = path.join('docs', 'api-reference');

/** Header pattern that declares a module identity, e.g. `// mod_12 - society module`. */
const MODULE_HEADER_RE = /^\/\/\s*mod_(\d+)\b/;

/** Flag that selects the per-file worker mode. */
const WORKER_FLAG = '--render-one';

/** Generous per-file render timeout (each render normally takes a few seconds). */
const RENDER_TIMEOUT_MS = 180000;

/** Buffer ceiling for a worker's stdout (a 1,200-function table is well under this). */
const MAX_BUFFER_BYTES = 64 * 1024 * 1024;

/**
 * Escape a value for safe inclusion in a single Markdown table cell.
 *
 * @param {*} value - The value to render into a cell.
 * @returns {string} The escaped, single-line cell text.
 */
function toCell(value) {
	return String(value == null ? '' : value)
		.replace(/\|/g, '\\|')
		.replace(/\r?\n/g, ' ')
		.trim();
}

/**
 * Build the compact Markdown API table for a module's functions from the
 * `jsdoc-to-markdown` template data.
 *
 * A single row per function (name, parameters, return type, description) keeps
 * each per-identity page small enough to render reliably into the consolidated
 * PDF, while still documenting every function — and it matches the AAP's
 * description of "a generated table of the module's functions (name, parameter,
 * return)" (§0.4.1).
 *
 * @param {object[]} functions - Function identifiers from `getTemplateData`.
 * @returns {string} The Markdown `## Functions` section.
 */
function buildApiTable(functions) {
	const header = [
		'## Functions',
		'',
		`Total functions: ${functions.length}`,
		'',
		'| Function | Parameters | Returns | Description |',
		'| --- | --- | --- | --- |',
	];

	const rows = functions.map((fn) => {
		const paramNames = (fn.params || []).map((p) => p.name);
		const signature = `${fn.name}(${paramNames.join(', ')})`;
		const params =
			(fn.params || [])
				.map((p) => {
					const types = ((p.type && p.type.names) || []).join(' \\| ');
					return `\`${p.name}\`${types ? ` (${types})` : ''}`;
				})
				.join('; ') || '—';
		const returns =
			(fn.returns || [])
				.map((r) => ((r.type && r.type.names) || []).join(' \\| '))
				.filter(Boolean)
				.join(', ') || '—';
		return `| \`${signature}\` | ${params} | ${returns} | ${toCell(fn.description)} |`;
	});

	return [...header, ...rows, ''].join('\n');
}

/**
 * Worker mode: parse exactly one file's JSDoc and write its compact Markdown API
 * table to stdout. Loaded as a fresh process by the parent, once per module file.
 *
 * @param {string} inputFile - Repository-relative path of the file to render.
 * @param {string} configFile - Path to the scoped JSDoc configuration.
 * @returns {Promise<void>} Resolves once the Markdown has been flushed to stdout.
 */
async function renderOne(inputFile, configFile) {
	const imported = await import('jsdoc-to-markdown');
	const jsdoc2md = imported.default || imported;
	const data = await jsdoc2md.getTemplateData({
		files: inputFile,
		configure: configFile,
		cache: false,
	});
	const functions = data.filter((identifier) => identifier.kind === 'function');
	const markdown = buildApiTable(functions);
	// Await the flush so the output is fully written before the process exits.
	await new Promise((resolve, reject) => {
		process.stdout.write(markdown, (error) => (error ? reject(error) : resolve()));
	});
}

/**
 * Recursively collect every `.js` file beneath a directory.
 *
 * @param {string} dir - Directory to walk, relative to the repository root.
 * @returns {string[]} Repository-relative file paths using forward slashes.
 */
function collectJsFiles(dir) {
	const absoluteDir = path.join(ROOT, dir);
	if (!fs.existsSync(absoluteDir)) {
		return [];
	}

	const results = [];
	for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
		const relativePath = `${dir}/${entry.name}`;
		if (entry.isDirectory()) {
			results.push(...collectJsFiles(relativePath));
		} else if (entry.isFile() && entry.name.endsWith('.js')) {
			results.push(relativePath);
		}
	}
	return results;
}

/**
 * Read the module identity declared on a file's first line.
 *
 * @param {string} relativePath - Repository-relative path to the JavaScript file.
 * @returns {string|null} The identity (e.g. `mod_12`) or `null` when the file
 *   declares no module header and must be skipped.
 */
function readModuleIdentity(relativePath) {
	const firstLine = fs
		.readFileSync(path.join(ROOT, relativePath), 'utf8')
		.split(/\r?\n/, 1)[0];
	const match = MODULE_HEADER_RE.exec(firstLine);
	return match ? `mod_${match[1]}` : null;
}

/**
 * Map a source file to its canonical API-reference output path.
 *
 * @param {string} relativePath - Repository-relative source path (forward slashes).
 * @param {string} identity - The module identity (e.g. `mod_3`).
 * @returns {string} Repository-relative output path for the generated page.
 */
function outputPathFor(relativePath, identity) {
	const parts = relativePath.split('/');
	const root = parts[0];
	// Directory segments between the source root and the file name form the layer.
	const layerSegments = parts.slice(1, -1);
	const layer = root === 'tests' ? ['tests', ...layerSegments].join('/') : layerSegments.join('/');
	return path.join(API_REFERENCE_DIR, ...layer.split('/'), `${identity}.md`);
}

/**
 * Derive a scoped JSDoc configuration that omits whole-tree `source` scanning,
 * so each per-file render is restricted to its single `files` input.
 *
 * @returns {string} Absolute path to the temporary scoped configuration file.
 */
function writeScopedConfig() {
	const base = JSON.parse(fs.readFileSync(path.join(ROOT, JSDOC_CONFIG), 'utf8'));
	delete base.source;
	const target = path.join(os.tmpdir(), `jsdoc-scoped-${process.pid}.json`);
	fs.writeFileSync(target, JSON.stringify(base), 'utf8');
	return target;
}

/**
 * Render one module file in a short-lived worker process and return its table.
 *
 * @param {string} relativePath - Repository-relative source path.
 * @param {string} scopedConfig - Path to the scoped JSDoc configuration.
 * @returns {string} The generated Markdown API table.
 */
function renderInWorker(relativePath, scopedConfig) {
	const result = spawnSync(
		process.execPath,
		[__filename, WORKER_FLAG, relativePath, scopedConfig],
		{ encoding: 'utf8', maxBuffer: MAX_BUFFER_BYTES, timeout: RENDER_TIMEOUT_MS }
	);

	if (result.status !== 0) {
		const detail = result.stderr || (result.error && result.error.message) || `exit ${result.status}`;
		throw new Error(`jsdoc2md failed for ${relativePath}: ${detail}`);
	}
	return result.stdout;
}

/**
 * Generate every per-identity API reference page.
 *
 * @returns {Promise<void>} Resolves once all pages have been written.
 */
async function main() {
	// Worker mode: render a single file and exit.
	const workerIndex = process.argv.indexOf(WORKER_FLAG);
	if (workerIndex !== -1) {
		await renderOne(process.argv[workerIndex + 1], process.argv[workerIndex + 2]);
		return;
	}

	// Parent mode: orchestrate per-file rendering into canonical pages.
	const files = SOURCE_ROOTS.flatMap(collectJsFiles).sort();
	if (files.length === 0) {
		throw new Error('No source files found under src/ or tests/.');
	}

	const scopedConfig = writeScopedConfig();
	let generated = 0;
	const skipped = [];

	try {
		for (const relativePath of files) {
			const identity = readModuleIdentity(relativePath);
			if (!identity) {
				skipped.push(relativePath);
				console.log(`  skip (no module header): ${relativePath}`);
				continue;
			}

			const table = renderInWorker(relativePath, scopedConfig);

			const outputPath = outputPathFor(relativePath, identity);
			fs.mkdirSync(path.dirname(outputPath), { recursive: true });

			// Prepend a factual title + source citation (AAP §0.9.1 citation
			// requirement), then the generated JSDoc API table.
			const layer = path
				.relative(API_REFERENCE_DIR, path.dirname(outputPath))
				.split(path.sep)
				.join('/');
			const page = `# ${identity}\n\n_Layer: ${layer} · Source: ${relativePath}_\n\n${table.trimStart()}`;

			fs.writeFileSync(outputPath, page, 'utf8');
			generated += 1;
			console.log(`  ${relativePath} -> ${outputPath.split(path.sep).join('/')}`);
		}
	} finally {
		fs.rmSync(scopedConfig, { force: true });
	}

	console.log(
		`docs:api complete — ${generated} per-identity page(s) generated, ${skipped.length} non-module file(s) skipped.`
	);
}

main().catch((error) => {
	console.error(`docs:api failed: ${error && error.stack ? error.stack : error}`);
	process.exit(1);
});
