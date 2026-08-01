// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
const test = require('node:test');
const assert = require('node:assert/strict');
const manifest = require('../extension/manifest.json');
test('ships a minimal Manifest V3 permission set', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions.sort(), ['activeTab', 'scripting', 'storage']);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
  assert.equal(manifest.background, undefined);
});
test('ships Samsarix release metadata', () => {
  assert.equal(manifest.name, 'Samsarix Page Lens');
  assert.equal(manifest.version, '1.3.0');
  assert.equal(manifest.homepage_url, 'https://samsarix.com');
});
