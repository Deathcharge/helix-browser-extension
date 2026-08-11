// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
import { cp, lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { zipSync } from 'fflate';
const source = new URL('../extension/', import.meta.url);
const output = new URL('../dist/samsarix-page-lens/', import.meta.url);
async function assertRegularTree(url, label) {
  const information = await lstat(url);
  if (information.isSymbolicLink()) throw new Error(`Package input must not be a symbolic link: ${label}`);
  if (information.isFile()) return;
  if (!information.isDirectory()) throw new Error(`Package input must be a regular file or directory: ${label}`);
  const directoryUrl = new URL(url.href.endsWith('/') ? url.href : `${url.href}/`);
  for (const entry of await readdir(directoryUrl, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`Package input must not be a symbolic link: ${label}/${entry.name}`);
    await assertRegularTree(new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directoryUrl), `${label}/${entry.name}`);
  }
}
const packageInputs = ['manifest.json', 'popup.html', 'popup.css', 'popup.js', 'analyzer.js', 'extractor.js', 'icons'];
for (const name of packageInputs) await assertRegularTree(new URL(name, source), `extension/${name}`);
for (const name of ['LICENSE', 'NOTICE']) await assertRegularTree(new URL(`../${name}`, import.meta.url), name);
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of packageInputs) await cp(new URL(name, source), new URL(name, output), { recursive: true });
for (const name of ['LICENSE', 'NOTICE']) await cp(new URL(`../${name}`, import.meta.url), new URL(name, output));
const manifest = JSON.parse(await readFile(new URL('manifest.json', output), 'utf8'));
await writeFile(new URL('BUILD_INFO.json', output), JSON.stringify({ name: manifest.name, version: manifest.version, reproducible: true }, null, 2) + '\n');
async function collectFiles(directory, prefix = '') {
  const files = {};
  const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  for (const entry of entries) {
    if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) throw new Error(`Build output contains a non-regular entry: ${prefix}${entry.name}`);
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
