// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const argumentsList = process.argv.slice(2);
if (argumentsList.some(argument => argument !== '--skip-live-privacy')) throw new Error(`Unknown argument: ${argumentsList.join(' ')}`);
const skipLivePrivacy = argumentsList.includes('--skip-live-privacy');
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const extensionDirectory = resolve(root, 'dist/samsarix-page-lens');
const manifest = JSON.parse(await readFile(resolve(extensionDirectory, 'manifest.json'), 'utf8'));
const archivePath = resolve(root, `dist/samsarix-page-lens-${manifest.version}.zip`);
const archive = await readFile(archivePath);
const files = unzipSync(new Uint8Array(archive));

const expected = [
  'BUILD_INFO.json', 'LICENSE', 'NOTICE', 'analyzer.js', 'extractor.js',
  'icons/icon128.png', 'icons/icon16.png', 'icons/icon32.png', 'icons/icon48.png',
  'manifest.json', 'popup.css', 'popup.html', 'popup.js'
];
const names = Object.keys(files).filter(name => !name.endsWith('/')).sort();
if (JSON.stringify(names) !== JSON.stringify(expected)) {
  throw new Error(`Unexpected ZIP contents:\n${names.join('\n')}`);
}
if (manifest.manifest_version !== 3) throw new Error('Submission must use Manifest V3');
if (JSON.stringify([...(manifest.permissions || [])].sort()) !== JSON.stringify(['activeTab', 'scripting', 'storage'])) throw new Error('Submission permission set is not approved');
const expectedCsp = "default-src 'self'; connect-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none';";
if (manifest.content_security_policy?.extension_pages !== expectedCsp) throw new Error('Submission does not enforce the reviewed local-only content security policy');
for (const forbidden of ['host_permissions', 'optional_host_permissions', 'content_scripts', 'background', 'externally_connectable']) {
  if (forbidden in manifest) throw new Error(`Submission unexpectedly declares ${forbidden}`);
}

async function diskFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    const information = await lstat(path);
    if (information.isSymbolicLink() || (!information.isDirectory() && !information.isFile())) throw new Error(`Submission contains a non-regular entry: ${path}`);
    if (entry.isDirectory()) result.push(...await diskFiles(path));
    else result.push(path);
  }
  return result;
}
for (const path of await diskFiles(extensionDirectory)) {
  const name = relative(extensionDirectory, path).split(sep).join('/');
  if (!files[name]) throw new Error(`${name} is absent from the ZIP`);
  const disk = await readFile(path);
  if (!Buffer.from(files[name]).equals(disk)) throw new Error(`${name} differs between the unpacked build and ZIP`);
}

for (const name of names.filter(name => /\.(?:html|css|js|json)$/i.test(name))) {
  const source = Buffer.from(files[name]).toString('utf8');
  if (/\b(?:eval|Function)\s*\(/.test(source)) throw new Error(`Potential dynamic code execution in ${name}`);
  if (/https?:\/\//i.test(source) && name !== 'manifest.json') throw new Error(`Unexpected remote URL in packaged ${name}`);
}

const requiredAssets = new Map([
  ['01-private-source-triage.png', [1280, 800]],
  ['02-local-comparison.png', [1280, 800]],
  ['03-language-honest.png', [1280, 800]],
  ['promo-small-440x280.png', [440, 280]]
]);
for (const [name, [width, height]] of requiredAssets) {
  const png = await readFile(resolve(root, 'store-assets', name));
  if (png.toString('ascii', 12, 16) !== 'IHDR' || png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== height) throw new Error(`${name} has incorrect dimensions`);
}
const privacyUrl = 'https://deathcharge.github.io/samsarix-page-lens/';
const sourcePrivacy = await readFile(resolve(root, 'site/privacy/index.html'));
if (!skipLivePrivacy) {
  const response = await fetch(`${privacyUrl}?submission-check=${Date.now()}`, {
    headers: { 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error(`Privacy disclosure returned HTTP ${response.status}`);
  const livePrivacy = Buffer.from(await response.arrayBuffer());
  if (!livePrivacy.equals(sourcePrivacy)) throw new Error('Live privacy disclosure does not match the reviewed repository source');
}

const sha256 = value => createHash('sha256').update(value).digest('hex').toUpperCase();
const report = {
  product: manifest.name,
  version: manifest.version,
  archive: relative(root, archivePath).split(sep).join('/'),
  archiveBytes: (await stat(archivePath)).size,
  archiveSha256: sha256(archive),
  privacyUrl,
  privacySha256: sha256(sourcePrivacy),
  livePrivacyVerified: !skipLivePrivacy,
  permissions: manifest.permissions,
  packagedFiles: names
};
await writeFile(resolve(root, 'dist/submission-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
console.log('Chrome Web Store submission artifact passed the automated readiness audit.');
