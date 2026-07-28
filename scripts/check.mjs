import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../helix_browser_extension/helix-browser-extension/', import.meta.url);
const names = await readdir(root);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
if (manifest.manifest_version !== 3) throw new Error('Manifest V3 is required');
for (const permission of manifest.permissions || []) {
  if (!['activeTab', 'scripting', 'storage'].includes(permission)) throw new Error(`Unexpected permission: ${permission}`);
}
for (const name of names.filter(name => extname(name) === '.js')) {
  const result = spawnSync(process.execPath, ['--check', join(fileURLToPath(root), name)], { stdio: 'inherit' });
  if (result.status) process.exit(result.status);
}
console.log('Manifest and JavaScript checks passed.');
