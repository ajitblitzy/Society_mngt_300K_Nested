#!/usr/bin/env node
/**
 * docs-diagrams.js — Render authored Mermaid diagrams to SVG.
 *
 * Cross-platform implementation of the `docs:diagrams` npm script. It replaces
 * the previous POSIX-only inline shell loop (`for f in docs/assets/diagrams/*.mmd;
 * do mmdc -i "$f" -o "${f%.mmd}.svg"; done`) — which used bash parameter
 * expansion (`${f%.mmd}`) and globbing semantics that do not work in the
 * Windows/PowerShell target — with a portable Node helper.
 *
 * Behaviour (per AAP §0.4.3 / §0.5.4):
 *   - Recursively discovers every `*.mmd` Mermaid source under `docs/`.
 *   - Renders each to `docs/assets/diagrams/<name>.svg` using the
 *     `@mermaid-js/mermaid-cli` (`mmdc`) executable.
 *   - Is a safe no-op when there are no diagrams to render (e.g. before any
 *     diagrams have been authored): it logs and exits 0 rather than failing the
 *     build pipeline.
 *
 * `mmdc` is invoked by running its package bin entry directly with the current
 * Node executable (`node <cli.js> ...`). This avoids depending on the platform
 * shell or on the `.cmd`/`.ps1` shims in `node_modules/.bin`, keeping the call
 * identical across operating systems.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

/** Repository root (npm runs the script with cwd at the package.json directory). */
const ROOT = process.cwd();

/** Directory that holds the authored documentation (Mermaid sources live under it). */
const DOCS_DIR = path.join(ROOT, 'docs');

/** Output directory for the rendered SVG diagrams (regenerated on every build). */
const DIAGRAMS_OUT_DIR = path.join(DOCS_DIR, 'assets', 'diagrams');

/**
 * Recursively collect every `*.mmd` file beneath a directory.
 *
 * @param {string} dir - Absolute directory to walk.
 * @returns {string[]} Absolute paths to Mermaid source files.
 */
function collectMermaidFiles(dir) {
	if (!fs.existsSync(dir)) {
		return [];
	}

	const results = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...collectMermaidFiles(fullPath));
		} else if (entry.isFile() && entry.name.endsWith('.mmd')) {
			results.push(fullPath);
		}
	}
	return results;
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
 * Render every discovered Mermaid diagram to SVG.
 *
 * @returns {void}
 */
function main() {
	const mermaidSources = collectMermaidFiles(DOCS_DIR);
	if (mermaidSources.length === 0) {
		console.log('docs:diagrams — no .mmd sources found under docs/; nothing to render.');
		return;
	}

	const mermaidCli = resolveMermaidCli();
	fs.mkdirSync(DIAGRAMS_OUT_DIR, { recursive: true });

	let rendered = 0;
	for (const source of mermaidSources) {
		const baseName = path.basename(source, '.mmd');
		const outputSvg = path.join(DIAGRAMS_OUT_DIR, `${baseName}.svg`);

		const result = spawnSync(
			process.execPath,
			[mermaidCli, '--input', source, '--output', outputSvg],
			{ stdio: 'inherit' }
		);

		if (result.status !== 0) {
			throw new Error(
				`mmdc failed for ${path.relative(ROOT, source)} (exit code ${result.status}).`
			);
		}

		rendered += 1;
		console.log(
			`  ${path.relative(ROOT, source).split(path.sep).join('/')} -> ` +
				`${path.relative(ROOT, outputSvg).split(path.sep).join('/')}`
		);
	}

	console.log(`docs:diagrams complete — ${rendered} diagram(s) rendered to SVG.`);
}

try {
	main();
} catch (error) {
	console.error(`docs:diagrams failed: ${error && error.stack ? error.stack : error}`);
	process.exit(1);
}
