// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
const source = new URL('../helix_browser_extension/helix-browser-extension/', import.meta.url);
const output = new URL('../dist/samsarix-page-lens/', import.meta.url);
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of ['manifest.json', 'popup.html', 'popup.css', 'popup.js', 'analyzer.js', 'icons']) await cp(new URL(name, source), new URL(name, output), { recursive: true });
for (const name of ['LICENSE', 'NOTICE']) await cp(new URL(`../${name}`, import.meta.url), new URL(name, output));
const manifest = JSON.parse(await readFile(new URL('manifest.json', output), 'utf8'));
await writeFile(new URL('BUILD_INFO.json', output), JSON.stringify({ name: manifest.name, version: manifest.version, reproducible: true }, null, 2) + '\n');
console.log(`Built unpacked extension: dist/samsarix-page-lens (${manifest.version})`);
