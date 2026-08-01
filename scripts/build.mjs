// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { zipSync } from 'fflate';
const source = new URL('../extension/', import.meta.url);
const output = new URL('../dist/samsarix-page-lens/', import.meta.url);
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of ['manifest.json', 'popup.html', 'popup.css', 'popup.js', 'analyzer.js', 'extractor.js', 'icons']) await cp(new URL(name, source), new URL(name, output), { recursive: true });
for (const name of ['LICENSE', 'NOTICE']) await cp(new URL(`../${name}`, import.meta.url), new URL(name, output));
const manifest = JSON.parse(await readFile(new URL('manifest.json', output), 'utf8'));
await writeFile(new URL('BUILD_INFO.json', output), JSON.stringify({ name: manifest.name, version: manifest.version, reproducible: true }, null, 2) + '\n');
async function collectFiles(directory, prefix = '') {
  const files = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) Object.assign(files, await collectFiles(url, `${prefix}${entry.name}/`));
    else files[`${prefix}${entry.name}`] = new Uint8Array(await readFile(url));
  }
  return files;
}
const zipName = `samsarix-page-lens-${manifest.version}.zip`;
const archive = zipSync(await collectFiles(output), { level: 9, mtime: new Date('2026-01-01T00:00:00Z') });
await writeFile(new URL(`../dist/${zipName}`, import.meta.url), archive);
console.log(`Built extension: dist/samsarix-page-lens and dist/${zipName}`);
