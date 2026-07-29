// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../helix_browser_extension/helix-browser-extension/', import.meta.url);
const names = await readdir(root);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
if (manifest.manifest_version !== 3) throw new Error('Manifest V3 is required');
if (manifest.name !== 'Samsarix Page Lens') throw new Error('Unexpected product name');
if (manifest.version !== packageJson.version) throw new Error('Manifest and package versions must match');
if (packageJson.license !== 'MPL-2.0') throw new Error('package.json must declare MPL-2.0');
const expectedPermissions = ['activeTab', 'scripting', 'storage'];
if (JSON.stringify([...(manifest.permissions || [])].sort()) !== JSON.stringify(expectedPermissions.sort())) throw new Error('Permission set changed; document and test any permission change');
if (manifest.host_permissions || manifest.content_scripts || manifest.background) throw new Error('Broad or always-on extension access is not allowed');
for (const name of names.filter(name => extname(name) === '.js')) {
  const result = spawnSync(process.execPath, ['--check', join(fileURLToPath(root), name)], { stdio: 'inherit' });
  if (result.status) process.exit(result.status);
  const source = await readFile(new URL(name, root), 'utf8');
  if (/\b(fetch|XMLHttpRequest|WebSocket)\s*\(/.test(source)) throw new Error(`Network API found in ${name}; review privacy documentation and architecture`);
}
console.log('Manifest and JavaScript checks passed.');
