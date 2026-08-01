// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../extension/', import.meta.url);
const names = await readdir(root);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const privacySite = await readFile(new URL('../site/privacy/index.html', import.meta.url), 'utf8');
const workflowDirectory = new URL('../.github/workflows/', import.meta.url);
const workflowNames = (await readdir(workflowDirectory)).filter(name => /\.ya?ml$/i.test(name));
const workflows = await Promise.all(workflowNames.map(async name => ({ name, source: await readFile(new URL(name, workflowDirectory), 'utf8') })));
const workflow = workflows.find(item => item.name === 'ci.yml')?.source || '';

function checkoutSteps(source) {
  const lines = source.split(/\r?\n/);
  const steps = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\s*)-\s+uses:\s*actions\/checkout@/);
    if (!match) continue;
    const indentation = match[1].length;
    const block = [lines[index]];
    while (++index < lines.length && (!lines[index].trim() || (lines[index].match(/^\s*/)?.[0].length || 0) > indentation)) block.push(lines[index]);
    index -= 1;
    steps.push(block.join('\n'));
  }
  return steps;
}

function topLevelTriggerNames(source) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex(line => /^on:\s*$/.test(line));
  if (start < 0) return [];
  const triggers = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^[^\s#]/.test(lines[index])) break;
    const match = lines[index].match(/^ {2}([A-Za-z_][\w-]*):/);
    if (match) triggers.push(match[1]);
  }
  return triggers;
}
if (manifest.manifest_version !== 3) throw new Error('Manifest V3 is required');
if (manifest.name !== 'Samsarix Page Lens') throw new Error('Unexpected product name');
if (manifest.version !== packageJson.version) throw new Error('Manifest and package versions must match');
if (packageJson.license !== 'MPL-2.0') throw new Error('package.json must declare MPL-2.0');
const expectedPermissions = ['activeTab', 'scripting', 'storage'];
if (JSON.stringify([...(manifest.permissions || [])].sort()) !== JSON.stringify(expectedPermissions.sort())) throw new Error('Permission set changed; document and test any permission change');
if (manifest.host_permissions || manifest.content_scripts || manifest.background) throw new Error('Broad or always-on extension access is not allowed');
const actionRefs = workflows.flatMap(item => [...item.source.matchAll(/uses:\s*[^@\s]+@([^\s#]+)/g)].map(match => match[1]));
if (!actionRefs.length || actionRefs.some(ref => !/^[a-f0-9]{40}$/.test(ref))) throw new Error('GitHub Actions must be pinned to immutable full commit SHAs');
if (workflows.flatMap(item => checkoutSteps(item.source)).some(step => !/^\s+persist-credentials:\s*false\s*(?:#.*)?$/m.test(step))) throw new Error('Every workflow checkout step must disable persisted credentials');
if (!/node-version:\s*24\b/.test(workflow)) throw new Error('CI must use the supported Node.js 24 baseline');
const pagesWorkflow = workflows.find(item => item.name === 'privacy-pages.yml')?.source || '';
if (JSON.stringify(topLevelTriggerNames(pagesWorkflow)) !== JSON.stringify(['workflow_dispatch'])) throw new Error('Privacy Pages publication must have workflow_dispatch as its only trigger');
for (const claim of ['no account system, analytics, advertising', 'at most 15,000 DOM nodes', 'capped at 25 briefs', 'capped at 500 characters', 'limited to 1 MB and 100 input records', 'support@samsarix.com']) {
  if (!privacySite.includes(claim)) throw new Error(`Hosted privacy disclosure is missing required claim: ${claim}`);
}
const storeAssetDirectory = new URL('../store-assets/', import.meta.url);
const storeImages = (await readdir(storeAssetDirectory)).filter(name => name.endsWith('.png'));
if (storeImages.length !== 3) throw new Error('Exactly three reviewed store screenshots are required');
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
for (const name of storeImages) {
  const png = await readFile(new URL(name, storeAssetDirectory));
  if (png.length < 24 || !png.subarray(0, 8).equals(pngSignature) || png.toString('ascii', 12, 16) !== 'IHDR' || png.readUInt32BE(16) !== 1280 || png.readUInt32BE(20) !== 800) throw new Error(`${name} must be a 1280x800 PNG`);
}
for (const name of names.filter(name => extname(name) === '.js')) {
  const result = spawnSync(process.execPath, ['--check', join(fileURLToPath(root), name)], { stdio: 'inherit' });
  if (result.status) process.exit(result.status);
  const source = await readFile(new URL(name, root), 'utf8');
  if (/\b(fetch|XMLHttpRequest|WebSocket)\s*\(/.test(source)) throw new Error(`Network API found in ${name}; review privacy documentation and architecture`);
}
console.log('Manifest, JavaScript, and workflow policy checks passed.');
