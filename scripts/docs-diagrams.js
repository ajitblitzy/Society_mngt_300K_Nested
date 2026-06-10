#!/usr/bin/env node
/**
 * docs-diagrams.js — Render the documentation's Mermaid diagrams to SVG.
 *
 * Cross-platform implementation of the `docs:diagrams` npm script. It replaces
 * the previous POSIX-only inline shell loop (`for f in docs/assets/diagrams/*.mmd;
 * do mmdc -i "$f" -o "${f%.mmd}.svg"; done`) — which used bash parameter
 * expansion (`${f%.mmd}`) and globbing semantics that do not work in the
 * Windows/PowerShell target — with a portable Node helper.
 *
 * Source-of-truth model (per AAP §0.4.2 / §0.4.3):
 *   The source of every diagram is the fenced ```mermaid block authored directly
 *   in its documentation page — NOT a separate `*.mmd` file. There are exactly
 *   three diagrams, each owned by one Markdown page and rendered to one fixed SVG
 *   name under `docs/assets/diagrams/`:
 *
 *     docs/architecture/overview.md   -> docs/assets/diagrams/structure.svg
 *     docs/api-reference/index.md     -> docs/assets/diagrams/module-grouping.svg
 *     docs/guides/pdf-export.md       -> docs/assets/diagrams/build-pipeline.svg
 *
 * Behaviour:
 *   - For each mapping, reads the page, extracts its first ```mermaid fenced
 *     block, writes that block to a throwaway temp `.mmd` file (outside the repo,
 *     under the OS temp dir), and renders it to the fixed SVG name with `mmdc`.
 *   - Is a safe no-op when no mapped page exists yet or none contains a Mermaid
 *     block (e.g. before the diagrams have been authored): it logs and exits 0
 *     rather than failing the build pipeline.
 *   - The rendered SVGs are git-ignored build outputs; the only tracked entry in
 *     `docs/assets/diagrams/` is the `.gitkeep` placeholder anchor.
 *
 * `mmdc` is invoked by running its package bin entry directly with the current
 * Node executable (`node <cli.js> ...`). This avoids depending on the platform
 * shell or on the `.cmd`/`.ps1` shims in `node_modules/.bin`, keeping the call
 * identical across operating systems.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

/** Repository root (npm runs the script with cwd at the package.json directory). */
const ROOT = process.cwd();

/** Directory that holds the authored documentation. */
const DOCS_DIR = path.join(ROOT, 'docs');

/** Output directory for the rendered SVG diagrams (regenerated on every build). */
const DIAGRAMS_OUT_DIR = path.join(DOCS_DIR, 'assets', 'diagrams');

/**
 * The diagram source-of-truth mapping: each documentation page that contains a
 * Mermaid block, paired with the fixed SVG file name it renders to. The page's
 * fenced ```mermaid block is the single source for the diagram.
 *
 * @type {ReadonlyArray<{ page: string, svg: string }>}
 */
const DIAGRAM_SOURCES = [
	{ page: path.join(DOCS_DIR, 'architecture', 'overview.md'), svg: 'structure.svg' },
	{ page: path.join(DOCS_DIR, 'api-reference', 'index.md'), svg: 'module-grouping.svg' },
	{ page: path.join(DOCS_DIR, 'guides', 'pdf-export.md'), svg: 'build-pipeline.svg' },
];

/**
 * Format an absolute path relative to the repository root using forward slashes,
 * for stable, platform-independent log output.
 *
 * @param {string} absolutePath - Absolute path to format.
 * @returns {string} Repo-relative path with `/` separators.
 */
function toRepoRelative(absolutePath) {
	return path.relative(ROOT, absolutePath).split(path.sep).join('/');
}

/**
 * Extract the first fenced ```mermaid code block from a Markdown document.
 *
 * @param {string} markdown - Full Markdown file contents.
 * @returns {string|null} The Mermaid source inside the fence, or `null` when the
 *   document contains no ```mermaid block.
 */
function extractMermaidBlock(markdown) {
	const match = markdown.match(/```mermaid[^\n]*\n([\s\S]*?)\n```/);
	return match ? match[1] : null;
}

/**
 * Resolve the absolute path to the `mmdc` CLI entry point of
 * `@mermaid-js/mermaid-cli`.
 *
 * The package's `package.json` is read directly from `node_modules` with `fs`
 * (rather than `require.resolve('<pkg>/package.json')`, which the package's
 * `exports` map blocks with ERR_PACKAGE_PATH_NOT_EXPORTED) so the helper does
 * not depend on the package exposing its manifest as a subpath export.
 *
 * @returns {string} Absolute path to the mermaid-cli bin JavaScript file.
 */
function resolveMermaidCli() {
	const packageDir = path.join(ROOT, 'node_modules', '@mermaid-js', 'mermaid-cli');
	const pkg = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
	const binRelative = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.mmdc;
	return path.join(packageDir, binRelative);
}

/**
 * Render every authored diagram to its fixed SVG name.
 *
 * @returns {void}
 */
function main() {
	// Collect the diagrams that are actually renderable right now: the page must
	// exist and must contain a Mermaid block.
	const jobs = [];
	for (const source of DIAGRAM_SOURCES) {
		if (!fs.existsSync(source.page)) {
			console.log(`docs:diagrams — skipping ${source.svg}: page ${toRepoRelative(source.page)} not found.`);
			continue;
		}
		const mermaid = extractMermaidBlock(fs.readFileSync(source.page, 'utf8'));
		if (!mermaid) {
			console.log(`docs:diagrams — skipping ${source.svg}: no \`\`\`mermaid block in ${toRepoRelative(source.page)}.`);
			continue;
		}
		jobs.push({ ...source, mermaid });
	}

	if (jobs.length === 0) {
		console.log('docs:diagrams — no Mermaid sources found in the documentation pages; nothing to render.');
		return;
	}

	const mermaidCli = resolveMermaidCli();
	fs.mkdirSync(DIAGRAMS_OUT_DIR, { recursive: true });

	// Extracted Mermaid is written to a throwaway temp directory (outside the
	// repository) so no intermediate `.mmd` artifacts are ever left in the tree.
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-diagrams-'));

	let rendered = 0;
	try {
		for (const job of jobs) {
			const tempMmd = path.join(tempDir, job.svg.replace(/\.svg$/, '.mmd'));
			fs.writeFileSync(tempMmd, `${job.mermaid}\n`, 'utf8');

			const outputSvg = path.join(DIAGRAMS_OUT_DIR, job.svg);
			const result = spawnSync(
				process.execPath,
				[mermaidCli, '--input', tempMmd, '--output', outputSvg],
				{ stdio: 'inherit' }
			);

			if (result.status !== 0) {
				throw new Error(
					`mmdc failed for ${toRepoRelative(job.page)} -> ${job.svg} (exit code ${result.status}).`
				);
			}

			rendered += 1;
			console.log(`  ${toRepoRelative(job.page)} -> ${toRepoRelative(outputSvg)}`);
		}
	} finally {
		fs.rmSync(tempDir, { recursive: true, force: true });
	}

	console.log(`docs:diagrams complete — ${rendered} diagram(s) rendered to SVG.`);
}

try {
	main();
} catch (error) {
	console.error(`docs:diagrams failed: ${error && error.stack ? error.stack : error}`);
	process.exit(1);
}
